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

  it("applies a platform gateway shield before route handlers", async () => {
    const routeWindow = rateLimitPolicyConfig["api-gateway"].windows.find((window) => window.scope === "route")!;
    expect(routeWindow.requests).toBeLessThanOrEqual(90);

    for (let index = 0; index < routeWindow.requests; index += 1) {
      await expect(enforceRateLimit(request("/api/catalog"), "api-gateway", undefined, { scopes: ["route"] })).resolves.toBeNull();
    }

    const blocked = await enforceRateLimit(request("/api/catalog"), "api-gateway", undefined, { scopes: ["route"] });

    expect(blocked?.status).toBe(429);
    expect(blocked?.headers.get("X-RateLimit-Policy")).toBe("api-gateway");
    expect(blocked?.headers.get("X-RateLimit-Scope")).toBe("route");
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

  it("limits authenticated admin write bursts by subject", async () => {
    const limit = rateLimitPolicyConfig["admin-write"].windows.find((window) => window.scope === "subject" && window.window === "1 m")!.requests;
    for (let index = 0; index < limit; index += 1) {
      await expect(enforceRateLimit(request("/api/admin/products"), "admin-write", "ops@example.fr", { scopes: ["subject"] })).resolves.toBeNull();
    }

    const blocked = await enforceRateLimit(request("/api/admin/products"), "admin-write", "ops@example.fr", { scopes: ["subject"] });
    const otherAdmin = await enforceRateLimit(request("/api/admin/products"), "admin-write", "stock@example.fr", { scopes: ["subject"] });

    expect(blocked?.status).toBe(429);
    expect(blocked?.headers.get("X-RateLimit-Policy")).toBe("admin-write");
    expect(blocked?.headers.get("X-RateLimit-Scope")).toBe("subject");
    expect(otherAdmin).toBeNull();
  });

  it("adds tight route shields for critical admin actions and media uploads", async () => {
    for (const policy of ["admin-sensitive", "media-upload"] as const) {
      const routeWindow = rateLimitPolicyConfig[policy].windows.find((window) => window.scope === "route")!;
      expect(routeWindow.requests).toBeLessThanOrEqual(18);

      clearLocalRateLimitBuckets();
      for (let index = 0; index < routeWindow.requests; index += 1) {
        await expect(enforceRateLimit(request(`/api/${policy}`), policy, undefined, { scopes: ["route"] })).resolves.toBeNull();
      }

      const blocked = await enforceRateLimit(request(`/api/${policy}`), policy, undefined, { scopes: ["route"] });

      expect(blocked?.status).toBe(429);
      expect(blocked?.headers.get("X-RateLimit-Policy")).toBe(policy);
      expect(blocked?.headers.get("X-RateLimit-Scope")).toBe("route");
    }
  });

  it("protects delivery quotes and recipe recalculations with dedicated policies", async () => {
    for (const policy of ["shipping-quote", "recipe-configurator"] as const) {
      const subjectWindow = rateLimitPolicyConfig[policy].windows.find((window) => window.scope === "subject" && window.window === "1 m")!;
      const routeWindow = rateLimitPolicyConfig[policy].windows.find((window) => window.scope === "route")!;

      expect(subjectWindow.requests).toBeLessThanOrEqual(24);
      expect(routeWindow.requests).toBeLessThanOrEqual(48);

      clearLocalRateLimitBuckets();
      for (let index = 0; index < subjectWindow.requests; index += 1) {
        await expect(enforceRateLimit(request(`/api/${policy}`), policy, "customer-auth-1", { scopes: ["subject"] })).resolves.toBeNull();
      }

      const blocked = await enforceRateLimit(request(`/api/${policy}`), policy, "customer-auth-1", { scopes: ["subject"] });

      expect(blocked?.status).toBe(429);
      expect(blocked?.headers.get("X-RateLimit-Policy")).toBe(policy);
      expect(blocked?.headers.get("X-RateLimit-Scope")).toBe("subject");
    }
  });
});
