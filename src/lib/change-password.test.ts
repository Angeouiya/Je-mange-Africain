import { afterEach, describe, expect, it, vi } from "vitest";
import { changePasswordWithFreshSession, ConnectedPasswordChangeInput } from "./change-password";

const session = {
  access_token: "fresh-access-token",
  refresh_token: "fresh-refresh-token",
  expires_in: 3600,
  user: { id: "auth-user-1", app_metadata: { role: "customer" } },
};

describe("connected password change", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("rejects a weak or mismatched new password before authentication", () => {
    expect(ConnectedPasswordChangeInput.safeParse({ currentPassword: "Ancien2025!", newPassword: "faible", confirmation: "autre" }).success).toBe(false);
    expect(ConnectedPasswordChangeInput.safeParse({ currentPassword: "Jma26!Aa", newPassword: "Jma26!Aa", confirmation: "Jma26!Aa" }).success).toBe(false);
  });

  it("verifies the current password before updating with a fresh session", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json(session))
      .mockResolvedValueOnce(Response.json({ user: session.user }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await changePasswordWithFreshSession({
      url: "https://jma.supabase.co",
      key: "publishable-key",
      email: "awa@example.fr",
      userId: "auth-user-1",
      currentPassword: "Ancien2025!",
      newPassword: "Jma26!Aa",
    });

    expect(result).toEqual({ ok: true, session });
    expect(fetchMock).toHaveBeenNthCalledWith(1, "https://jma.supabase.co/auth/v1/token?grant_type=password", expect.objectContaining({ method: "POST", cache: "no-store" }));
    expect(JSON.parse(String(fetchMock.mock.calls[0][1].body))).toEqual({ email: "awa@example.fr", password: "Ancien2025!" });
    expect(fetchMock).toHaveBeenNthCalledWith(2, "https://jma.supabase.co/auth/v1/user", expect.objectContaining({ method: "PUT", cache: "no-store" }));
    expect(JSON.parse(String(fetchMock.mock.calls[1][1].body))).toEqual({ password: "Jma26!Aa" });
  });

  it("does not attempt the update when the current password is wrong", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ error: "invalid_credentials" }, { status: 400 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await changePasswordWithFreshSession({
      url: "https://jma.supabase.co",
      key: "publishable-key",
      email: "awa@example.fr",
      userId: "auth-user-1",
      currentPassword: "incorrect",
      newPassword: "Jma26!Aa",
    });

    expect(result).toEqual({ ok: false, reason: "current_password" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("refuses a fresh session issued for a different identity", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ ...session, user: { id: "another-user" } }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await changePasswordWithFreshSession({
      url: "https://jma.supabase.co",
      key: "publishable-key",
      email: "awa@example.fr",
      userId: "auth-user-1",
      currentPassword: "Ancien2025!",
      newPassword: "Jma26!Aa",
    });

    expect(result).toEqual({ ok: false, reason: "identity" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
