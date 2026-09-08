import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  enforceRateLimit: vi.fn(),
  getSupabaseCustomerConfig: vi.fn(),
  fetch: vi.fn(),
}));

vi.mock("@/lib/redis", () => ({ enforceRateLimit: mocks.enforceRateLimit }));
vi.mock("@/lib/customer-auth", () => ({ getSupabaseCustomerConfig: mocks.getSupabaseCustomerConfig }));

import { POST, PUT } from "./route";

function jsonRequest(url: string, body: Record<string, unknown>) {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function sentBody() {
  const init = mocks.fetch.mock.calls[0]?.[1] as RequestInit | undefined;
  return JSON.parse(String(init?.body || "{}")) as Record<string, unknown>;
}

describe("customer password production flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", mocks.fetch);
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://je-mange-africain.com");
    mocks.enforceRateLimit.mockResolvedValue(null);
    mocks.getSupabaseCustomerConfig.mockReturnValue({
      url: "https://ahigidhuhqcmxzjxetnw.supabase.co",
      key: "sb_publishable_test",
    });
    mocks.fetch.mockResolvedValue(new Response("{}", { status: 200 }));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("sends the production reset link to Supabase for the requested account", async () => {
    const response = await POST(jsonRequest("https://je-mange-africain.com/api/auth/customer/password", {
      email: "ezechielouiya@gmail.com",
    }));

    expect(response.status).toBe(200);
    expect(mocks.fetch).toHaveBeenCalledWith("https://ahigidhuhqcmxzjxetnw.supabase.co/auth/v1/recover", expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({ apikey: "sb_publishable_test", "Content-Type": "application/json" }),
    }));
    expect(sentBody()).toMatchObject({
      email: "ezechielouiya@gmail.com",
      redirect_to: "https://je-mange-africain.com/auth/reset",
    });
  });

  it("does not claim success when Supabase rejects recovery delivery", async () => {
    mocks.fetch.mockResolvedValue(new Response("{}", { status: 429 }));

    const response = await POST(jsonRequest("https://je-mange-africain.com/api/auth/customer/password", {
      email: "ezechielouiya@gmail.com",
    }));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "Le service de récupération est momentanément indisponible.",
    });
  });

  it("does not let an untrusted request host control the recovery redirect", async () => {
    const response = await POST(jsonRequest("https://malicious.example/api/auth/customer/password", {
      email: "ezechielouiya@gmail.com",
    }));

    expect(response.status).toBe(200);
    expect(sentBody()).toMatchObject({
      redirect_to: "https://je-mange-africain.com/auth/reset",
    });
  });

  it("falls back to the production reset URL when the public site URL is not HTTPS", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");

    const response = await POST(jsonRequest("http://localhost:3000/api/auth/customer/password", {
      email: "ezechielouiya@gmail.com",
    }));

    expect(response.status).toBe(200);
    expect(sentBody()).toMatchObject({
      redirect_to: "https://je-mange-africain.com/auth/reset",
    });
  });

  it("does not let a Vercel production URL control the recovery redirect", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://je-mange-africain.vercel.app");

    const response = await POST(jsonRequest("https://je-mange-africain.vercel.app/api/auth/customer/password", {
      email: "ezechielouiya@gmail.com",
    }));

    expect(response.status).toBe(200);
    expect(sentBody()).toMatchObject({
      redirect_to: "https://je-mange-africain.com/auth/reset",
    });
  });

  it("normalizes the www storefront reset redirect to the official apex domain", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://www.je-mange-africain.com");

    const response = await POST(jsonRequest("https://www.je-mange-africain.com/api/auth/customer/password", {
      email: "ezechielouiya@gmail.com",
    }));

    expect(response.status).toBe(200);
    expect(sentBody()).toMatchObject({
      redirect_to: "https://je-mange-africain.com/auth/reset",
    });
  });

  it("updates the password only with the recovery access token", async () => {
    const accessToken = "reset-token-with-enough-length";
    const request = jsonRequest("https://je-mange-africain.com/api/auth/customer/password", {
      accessToken,
      password: "NouveauMotDePasse2026!",
    });

    const response = await PUT(request);
    const init = mocks.fetch.mock.calls[0]?.[1] as RequestInit | undefined;

    expect(response.status).toBe(200);
    expect(mocks.fetch).toHaveBeenCalledWith("https://ahigidhuhqcmxzjxetnw.supabase.co/auth/v1/user", expect.objectContaining({
      method: "PUT",
      headers: expect.objectContaining({ Authorization: `Bearer ${accessToken}` }),
    }));
    expect(JSON.parse(String(init?.body || "{}"))).toEqual({ password: "NouveauMotDePasse2026!" });
  });
});
