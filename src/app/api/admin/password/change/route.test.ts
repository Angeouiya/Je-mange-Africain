import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  perimeter: vi.fn(),
  subject: vi.fn(),
  config: vi.fn(),
  setCookies: vi.fn(),
  auditCreate: vi.fn(),
  email: vi.fn(),
  fetch: vi.fn(),
}));

vi.mock("@/lib/admin-auth", () => ({
  ADMIN_ROLES: new Set(["super_admin"]),
  authorizeAdminRequest: mocks.authorize,
  getSupabaseAdminConfig: mocks.config,
  setAdminCookies: mocks.setCookies,
}));
vi.mock("@/lib/admin-rate-limit", () => ({
  adminRateLimitSubject: (user: { id: string }) => user.id,
  enforceAdminCriticalPerimeterRateLimit: mocks.perimeter,
  enforceAdminCriticalSubjectRateLimit: mocks.subject,
}));
vi.mock("@/lib/db", () => ({ db: { auditLog: { create: mocks.auditCreate } } }));
vi.mock("@/lib/password-change-email", () => ({ sendPasswordChangedEmail: mocks.email }));

import { PATCH } from "./route";

const user = { id: "admin-auth-1", email: "direction@example.fr", role: "super_admin" };

function request(body: Record<string, unknown>) {
  return new NextRequest("https://admin.je-mange-africain.com/api/admin/password/change", {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "cf-connecting-ip": "203.0.113.10" },
    body: JSON.stringify(body),
  });
}

describe("connected admin password change", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", mocks.fetch);
    mocks.perimeter.mockResolvedValue(null);
    mocks.subject.mockResolvedValue(null);
    mocks.authorize.mockResolvedValue({ ok: true, user });
    mocks.config.mockReturnValue({ url: "https://jma.supabase.co", key: "publishable-key" });
    mocks.auditCreate.mockResolvedValue({ id: "audit-1" });
    mocks.email.mockResolvedValue({ sent: true, provider: "gmail", messageId: "gmail-1" });
  });

  afterEach(() => vi.unstubAllGlobals());

  it("keeps the administrator connected after current-password verification", async () => {
    const freshSession = { access_token: "fresh-access", refresh_token: "fresh-refresh", expires_in: 3600, user: { id: user.id, app_metadata: { role: user.role } } };
    mocks.fetch.mockResolvedValueOnce(Response.json(freshSession)).mockResolvedValueOnce(Response.json({ user: freshSession.user }));

    const response = await PATCH(request({ currentPassword: "Ancien2025!", newPassword: "Jma26!Aa", confirmation: "Jma26!Aa" }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, sessionPreserved: true, securityEmailSent: true });
    expect(mocks.setCookies).toHaveBeenCalledWith(expect.any(NextResponse), freshSession);
    expect(mocks.email).toHaveBeenCalledWith(user.email);
    expect(mocks.auditCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ action: "admin_password_change", entityId: user.id, ip: "203.0.113.10" }) });
  });

  it("returns a precise error for an incorrect current password", async () => {
    mocks.fetch.mockResolvedValue(Response.json({ error: "invalid_credentials" }, { status: 400 }));

    const response = await PATCH(request({ currentPassword: "Incorrect2025!", newPassword: "Jma26!Aa", confirmation: "Jma26!Aa" }));

    expect(response.status).toBe(401);
    expect(mocks.setCookies).not.toHaveBeenCalled();
    expect(mocks.auditCreate).not.toHaveBeenCalled();
  });
});
