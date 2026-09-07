import { afterEach, describe, expect, it, vi } from "vitest";

function request(path = "/api/payments/intent", language = "fr-FR") {
  return new Request(`https://je-mange-africain.com${path}`, {
    headers: { "cf-connecting-ip": "203.0.113.24", "accept-language": language },
  });
}

describe("production rate limiting safety", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.doUnmock("@upstash/redis");
    vi.doUnmock("@upstash/ratelimit");
    vi.resetModules();
  });

  it("fails closed for protected production actions when remote Redis is missing", async () => {
    vi.resetModules();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");

    const { enforceRateLimit, remoteRateLimitRequired } = await import("./redis");
    const blocked = await enforceRateLimit(request(), "payment-intent", undefined, { scopes: ["ip"] });

    expect(remoteRateLimitRequired("payment-intent")).toBe(true);
    expect(blocked?.status).toBe(503);
    expect(blocked?.headers.get("Cache-Control")).toBe("no-store");
    expect(blocked?.headers.get("Retry-After")).toBe("30");
    expect(blocked?.headers.get("X-RateLimit-Mode")).toBe("required");
    await expect(blocked?.json()).resolves.toMatchObject({ code: "RATE_LIMIT_UNAVAILABLE", policy: "payment-intent" });
  });

  it("fails closed for protected production actions when remote Redis cannot answer", async () => {
    vi.resetModules();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example.test");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "redis-token");
    vi.doMock("@upstash/redis", () => ({
      Redis: class Redis {
        constructor(_: unknown) {}
      },
    }));
    vi.doMock("@upstash/ratelimit", () => ({
      Ratelimit: class Ratelimit {
        static slidingWindow(_: number, __: string) {
          return {};
        }

        constructor(_: unknown) {}

        async limit() {
          throw new Error("Redis unavailable");
        }
      },
    }));

    const { enforceRateLimit } = await import("./redis");
    const blocked = await enforceRateLimit(request("/api/admin/orders/1", "en-US"), "admin-sensitive", "admin-1", { scopes: ["subject"] });

    expect(blocked?.status).toBe(503);
    expect(blocked?.headers.get("X-RateLimit-Policy")).toBe("admin-sensitive");
    await expect(blocked?.json()).resolves.toMatchObject({
      code: "RATE_LIMIT_UNAVAILABLE",
      error: "This protected action is temporarily unavailable while security throttling is offline.",
    });
  });

  it("keeps catalogue search usable with a local emergency bucket", async () => {
    vi.resetModules();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");

    const { enforceRateLimit, rateLimitPolicyConfig, remoteRateLimitRequired } = await import("./redis");
    const limit = rateLimitPolicyConfig.search.windows.find((window) => window.scope === "ip")!.requests;

    expect(remoteRateLimitRequired("search")).toBe(false);
    for (let index = 0; index < limit; index += 1) {
      await expect(enforceRateLimit(request("/api/search?q=atti%C3%A9k%C3%A9"), "search", undefined, { scopes: ["ip"] })).resolves.toBeNull();
    }

    const blocked = await enforceRateLimit(request("/api/search?q=atti%C3%A9k%C3%A9"), "search", undefined, { scopes: ["ip"] });

    expect(blocked?.status).toBe(429);
    await expect(blocked?.json()).resolves.toMatchObject({ code: "RATE_LIMITED", policy: "search" });
  });

  it("requires remote throttling for delivery quotes and recipe recalculations in production", async () => {
    vi.resetModules();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");

    const { enforceRateLimit, remoteRateLimitRequired } = await import("./redis");

    for (const policy of ["shipping-quote", "recipe-configurator"] as const) {
      const blocked = await enforceRateLimit(request(`/api/${policy}`), policy, undefined, { scopes: ["ip"] });

      expect(remoteRateLimitRequired(policy)).toBe(true);
      expect(blocked?.status).toBe(503);
      await expect(blocked?.json()).resolves.toMatchObject({ code: "RATE_LIMIT_UNAVAILABLE", policy });
    }
  });
});
