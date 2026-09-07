import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  enforceRateLimit: vi.fn(),
}));

vi.mock("@/lib/redis", () => ({ enforceRateLimit: mocks.enforceRateLimit }));

import { authorizeAdminRequest } from "./admin-auth";

const adminUser = {
  id: "admin-auth-1",
  email: "ops@example.fr",
  app_metadata: { role: "super_admin" },
};

function adminRequest(method = "GET") {
  return new NextRequest("https://je-mange-africain.com/api/admin/products", {
    method,
    headers: { authorization: "Bearer admin-token" },
  });
}

describe("authorizeAdminRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("SUPABASE_URL", "https://jma.supabase.co");
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "publishable-key");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(adminUser), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })));
    mocks.enforceRateLimit.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("rate limits admin reads before and after identity verification", async () => {
    const request = adminRequest("GET");

    const authorization = await authorizeAdminRequest(request, { module: "catalog", action: "read" });

    expect(authorization.ok).toBe(true);
    expect(mocks.enforceRateLimit).toHaveBeenNthCalledWith(1, request, "admin-read", undefined, { scopes: ["ip", "route"] });
    expect(mocks.enforceRateLimit).toHaveBeenNthCalledWith(2, request, "admin-read", adminUser.id, { scopes: ["subject"] });
  });

  it("blocks admin writes when the authenticated identity is over its limit", async () => {
    const request = adminRequest("POST");
    const limited = NextResponse.json({ error: "Too many admin actions" }, { status: 429 });
    mocks.enforceRateLimit.mockResolvedValueOnce(null).mockResolvedValueOnce(limited);

    const authorization = await authorizeAdminRequest(request, { module: "catalog", action: "create" });

    expect(authorization.ok).toBe(false);
    if (!authorization.ok) expect(authorization.response.status).toBe(429);
    expect(mocks.enforceRateLimit).toHaveBeenNthCalledWith(1, request, "admin-write", undefined, { scopes: ["ip", "route"] });
    expect(mocks.enforceRateLimit).toHaveBeenNthCalledWith(2, request, "admin-write", adminUser.id, { scopes: ["subject"] });
  });

  it("does not spend identity quota when the Supabase session is invalid", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: "invalid" }), { status: 401 })));
    const request = adminRequest("GET");

    const authorization = await authorizeAdminRequest(request, { module: "catalog", action: "read" });

    expect(authorization.ok).toBe(false);
    expect(mocks.enforceRateLimit).toHaveBeenCalledTimes(1);
  });
});
