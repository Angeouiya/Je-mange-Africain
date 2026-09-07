import { beforeEach, describe, expect, it } from "vitest";
import { clearLocalRateLimitBuckets, enforceRateLimit, rateLimitPolicyConfig } from "./redis";

function request(path = "/api/auth/customer/session", ip = "203.0.113.42", language = "fr-FR") {
  return new Request(`https://je-mange-africain.com${path}`, {
    headers: { "x-forwarded-for": ip, "accept-language": language },
  });
}

describe("enforceRateLimit", () => {
  beforeEach(() => {
    clearLocalRateLimitBuckets();
  });

  it("blocks repeated authentication attempts by IP", async () => {
    const limit = rateLimitPolicyConfig.auth.windows.find((window) => window.scope === "ip" && window.window === "1 m")!.requests;
    for (let index = 0; index < limit; index += 1) {
      await expect(enforceRateLimit(request(), "auth", undefined, { scopes: ["ip"] })).resolves.toBeNull();
    }

    const blocked = await enforceRateLimit(request(), "auth", undefined, { scopes: ["ip"] });

    expect(blocked?.status).toBe(429);
    expect(blocked?.headers.get("Retry-After")).toBeTruthy();
    expect(blocked?.headers.get("X-RateLimit-Policy")).toBe("auth");
    expect(blocked?.headers.get("X-RateLimit-Scope")).toBe("ip");
    await expect(blocked?.json()).resolves.toMatchObject({ code: "RATE_LIMITED", policy: "auth" });
  });

  it("keeps identity limits independent across customers", async () => {
    const limit = rateLimitPolicyConfig.auth.windows.find((window) => window.scope === "subject")!.requests;
    for (let index = 0; index < limit; index += 1) {
      await expect(enforceRateLimit(request(), "auth", "awa@example.com", { scopes: ["subject"] })).resolves.toBeNull();
    }

    const blocked = await enforceRateLimit(request(), "auth", "awa@example.com", { scopes: ["subject"] });
    const otherCustomer = await enforceRateLimit(request(), "auth", "kouame@example.com", { scopes: ["subject"] });

    expect(blocked?.status).toBe(429);
    expect(blocked?.headers.get("X-RateLimit-Scope")).toBe("subject");
    expect(otherCustomer).toBeNull();
  });

  it("isolates route scoped limits by path", async () => {
    const policy = "payment-intent";
    const limit = rateLimitPolicyConfig[policy].windows.find((window) => window.scope === "route")!.requests;
    for (let index = 0; index < limit; index += 1) {
      await expect(enforceRateLimit(request("/api/payments/intent"), policy, undefined, { scopes: ["route"] })).resolves.toBeNull();
    }

    const blocked = await enforceRateLimit(request("/api/payments/intent"), policy, undefined, { scopes: ["route"] });
    const otherRoute = await enforceRateLimit(request("/api/checkout"), policy, undefined, { scopes: ["route"] });

    expect(blocked?.status).toBe(429);
    expect(blocked?.headers.get("X-RateLimit-Scope")).toBe("route");
    expect(otherRoute).toBeNull();
  });
});
