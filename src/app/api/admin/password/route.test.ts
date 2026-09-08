import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  enforceRateLimit: vi.fn(),
  getSupabaseAdminConfig: vi.fn(),
  fetch: vi.fn(),
}));

vi.mock("@/lib/redis", () => ({ enforceRateLimit: mocks.enforceRateLimit }));
vi.mock("@/lib/admin-auth", () => ({
  ADMIN_ROLES: new Set(["super_admin", "direction"]),
  getSupabaseAdminConfig: mocks.getSupabaseAdminConfig,
}));

import { POST, PUT } from "./route";

function request(body: Record<string, unknown>) {
  return new Request("https://admin.je-mange-africain.com/api/admin/password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("admin password recovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", mocks.fetch);
    mocks.enforceRateLimit.mockResolvedValue(null);
    mocks.getSupabaseAdminConfig.mockReturnValue({
      url: "https://ahigidhuhqcmxzjxetnw.supabase.co",
      key: "sb_publishable_test",
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it("requests a recovery link for the isolated admin surface", async () => {
    mocks.fetch.mockResolvedValue(new Response("{}", { status: 200 }));

    const response = await POST(request({ email: "ezechielouiya@gmail.com" }));
    const init = mocks.fetch.mock.calls[0][1] as RequestInit;

    expect(response.status).toBe(200);
    expect(mocks.fetch.mock.calls[0][0]).toBe("https://ahigidhuhqcmxzjxetnw.supabase.co/auth/v1/recover");
    expect(JSON.parse(String(init.body))).toEqual({
      email: "ezechielouiya@gmail.com",
      redirect_to: "https://admin.je-mange-africain.com/admin/reset",
    });
  });

  it("does not claim success when Supabase rejects recovery delivery", async () => {
    mocks.fetch.mockResolvedValue(new Response("{}", { status: 500 }));

    const response = await POST(request({ email: "ezechielouiya@gmail.com" }));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "Le service de récupération professionnel est momentanément indisponible.",
    });
  });

  it("updates only an authorized professional identity", async () => {
    mocks.fetch
      .mockResolvedValueOnce(Response.json({ app_metadata: { role: "super_admin" } }))
      .mockResolvedValueOnce(new Response("{}", { status: 200 }));

    const response = await PUT(request({ accessToken: "professional-recovery-token", password: "NouveauMotDePasse2026!" }));

    expect(response.status).toBe(200);
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
    expect(mocks.fetch.mock.calls[1][1]).toEqual(expect.objectContaining({ method: "PUT" }));
  });

  it("refuses a customer recovery token on the professional surface", async () => {
    mocks.fetch.mockResolvedValue(Response.json({ app_metadata: { role: "customer" } }));

    const response = await PUT(request({ accessToken: "customer-recovery-token-long", password: "NouveauMotDePasse2026!" }));

    expect(response.status).toBe(403);
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });
});
