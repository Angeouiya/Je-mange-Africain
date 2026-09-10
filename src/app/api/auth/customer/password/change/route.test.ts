import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  config: vi.fn(),
  setCookies: vi.fn(),
  toSession: vi.fn(),
  rateLimit: vi.fn(),
  userFind: vi.fn(),
  auditCreate: vi.fn(),
  notify: vi.fn(),
  email: vi.fn(),
  fetch: vi.fn(),
}));

vi.mock("@/lib/customer-auth", () => ({
  authorizeCustomerRequest: mocks.authorize,
  getSupabaseCustomerConfig: mocks.config,
  setCustomerCookies: mocks.setCookies,
  toCustomerSession: mocks.toSession,
}));
vi.mock("@/lib/redis", () => ({ enforceRateLimit: mocks.rateLimit }));
vi.mock("@/lib/db", () => ({
  db: {
    user: { findUnique: mocks.userFind },
    auditLog: { create: mocks.auditCreate },
  },
}));
vi.mock("@/lib/user-notifications", () => ({ createAndSendUserNotification: mocks.notify }));
vi.mock("@/lib/password-change-email", () => ({ sendPasswordChangedEmail: mocks.email }));

import { PATCH } from "./route";

const customer = { id: "customer-auth-1", email: "awa@example.fr", role: "customer" };

function request(body: Record<string, unknown>) {
  return new NextRequest("https://je-mange-africain.com/api/auth/customer/password/change", {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "cf-connecting-ip": "203.0.113.20" },
    body: JSON.stringify(body),
  });
}

describe("connected customer password change", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", mocks.fetch);
    mocks.rateLimit.mockResolvedValue(null);
    mocks.authorize.mockResolvedValue(customer);
    mocks.config.mockReturnValue({ url: "https://jma.supabase.co", key: "publishable-key" });
    mocks.toSession.mockReturnValue(customer);
    mocks.userFind.mockResolvedValue({ id: "directory-user-1" });
    mocks.auditCreate.mockResolvedValue({ id: "audit-1" });
    mocks.notify.mockResolvedValue({ notificationId: "notification-1" });
    mocks.email.mockResolvedValue({ sent: true, provider: "gmail", messageId: "gmail-1" });
  });

  afterEach(() => vi.unstubAllGlobals());

  it("refreshes the current session and sends security notifications", async () => {
    const freshSession = { access_token: "fresh-access", refresh_token: "fresh-refresh", expires_in: 3600, user: { id: customer.id, email: customer.email, app_metadata: { role: "customer" } } };
    mocks.fetch.mockResolvedValueOnce(Response.json(freshSession)).mockResolvedValueOnce(Response.json({ user: freshSession.user }));

    const response = await PATCH(request({ currentPassword: "Ancien2025!", newPassword: "Jma26!Aa", confirmation: "Jma26!Aa" }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, sessionPreserved: true, securityEmailSent: true });
    expect(mocks.setCookies).toHaveBeenCalledWith(expect.any(NextResponse), freshSession);
    expect(mocks.email).toHaveBeenCalledWith(customer.email);
    expect(mocks.notify).toHaveBeenCalledWith(expect.objectContaining({ userId: "directory-user-1", type: "system", url: "/?view=account&accountSection=settings" }));
    expect(mocks.auditCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ action: "customer_password_change", userId: "directory-user-1", ip: "203.0.113.20" }) });
  });

  it("requires an authenticated customer session", async () => {
    mocks.authorize.mockResolvedValue(null);

    const response = await PATCH(request({ currentPassword: "Ancien2025!", newPassword: "Jma26!Aa", confirmation: "Jma26!Aa" }));

    expect(response.status).toBe(401);
    expect(mocks.fetch).not.toHaveBeenCalled();
    expect(mocks.setCookies).not.toHaveBeenCalled();
  });
});
