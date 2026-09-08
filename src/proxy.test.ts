import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "./proxy";
import { clearLocalRateLimitBuckets, rateLimitPolicyConfig } from "@/lib/redis";

function makeRequest(url: string, host: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("host", host);
  if (!headers.has("x-forwarded-for")) headers.set("x-forwarded-for", "203.0.113.87");

  return new NextRequest(url, {
    method: init.method,
    headers,
  });
}

describe("platform proxy separation", () => {
  it("serves the admin platform from the admin domain root", async () => {
    const response = await proxy(makeRequest("https://admin.je-mange-africain.com/", "admin.je-mange-africain.com"));

    expect(response.headers.get("x-middleware-rewrite")).toBe("https://admin.je-mange-africain.com/admin");
  });

  it("moves admin pages away from the customer domain in production", async () => {
    const response = await proxy(makeRequest("https://je-mange-africain.com/admin?team=1", "je-mange-africain.com"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://admin.je-mange-africain.com/admin?team=1");
  });

  it("moves admin API traffic away from the customer domain in production", async () => {
    const response = await proxy(makeRequest("https://je-mange-africain.com/api/admin/session", "je-mange-africain.com"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://admin.je-mange-africain.com/api/admin/session");
  });

  it("keeps the public storefront canonical on the root domain", async () => {
    const response = await proxy(makeRequest("https://www.je-mange-africain.com/recettes?country=CI", "www.je-mange-africain.com"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://je-mange-africain.com/recettes?country=CI");
  });

  it("keeps admin paths on the admin domain even when they arrive from www", async () => {
    const response = await proxy(makeRequest("https://www.je-mange-africain.com/admin/orders", "www.je-mange-africain.com"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://admin.je-mange-africain.com/admin/orders");
  });

  it("keeps local admin routes available for development and tests", async () => {
    const response = await proxy(makeRequest("http://127.0.0.1:3000/admin", "127.0.0.1:3000"));

    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("shields API routes before they reach route handlers", async () => {
    clearLocalRateLimitBuckets();
    const limit = rateLimitPolicyConfig["api-gateway"].windows.find((window) => window.scope === "route")!.requests;

    for (let index = 0; index < limit; index += 1) {
      const response = await proxy(makeRequest("https://je-mange-africain.com/api/catalog", "je-mange-africain.com"));
      expect(response.headers.get("x-middleware-next")).toBe("1");
    }

    const blocked = await proxy(makeRequest("https://je-mange-africain.com/api/catalog", "je-mange-africain.com"));

    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("X-RateLimit-Policy")).toBe("api-gateway");
    expect(blocked.headers.get("X-RateLimit-Scope")).toBe("route");
    await expect(blocked.json()).resolves.toMatchObject({ code: "RATE_LIMITED", policy: "api-gateway" });
  });

  it("keeps API preflight requests available for browser negotiation", async () => {
    clearLocalRateLimitBuckets();

    const response = await proxy(makeRequest("https://je-mange-africain.com/api/catalog", "je-mange-africain.com", { method: "OPTIONS" }));

    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.headers.get("X-RateLimit-Policy")).toBeNull();
  });
});
