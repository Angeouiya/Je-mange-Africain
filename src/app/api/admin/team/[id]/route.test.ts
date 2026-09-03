import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  supabaseFetch: vi.fn(),
  updateMembership: vi.fn(),
  deleteMembership: vi.fn(),
  createAudit: vi.fn(),
}));

vi.mock("@/lib/admin-auth", () => ({
  ADMIN_ROLES: new Set(["super_admin", "marketing", "support"]),
  authorizeAdminRequest: mocks.authorize,
  getSupabaseAdminConfig: () => ({ url: "https://identity.example.test", serviceRoleKey: "server-secret" }),
}));

vi.mock("@/lib/admin-permissions", () => ({
  permissionsForRole: (role: string) => role === "support" ? { customers: ["read", "update"] } : { marketing: ["read"] },
}));

vi.mock("@/lib/db", () => ({
  db: {
    adminMembership: { updateMany: mocks.updateMembership, deleteMany: mocks.deleteMembership },
    auditLog: { create: mocks.createAudit },
  },
}));

vi.mock("@/lib/supabase-admin-team", () => ({
  supabaseAuthAdminFetch: mocks.supabaseFetch,
  teamConfigurationError: () => Response.json({ error: "configuration" }, { status: 503 }),
  teamServiceUnavailableError: () => Response.json({ error: "unavailable" }, { status: 503 }),
}));

import { DELETE, PATCH } from "@/app/api/admin/team/[id]/route";

const targetUser = {
  id: "member-1",
  email: "marketing@je-mange-africain.com",
  app_metadata: { role: "marketing" },
  confirmed_at: "2026-01-01T00:00:00.000Z",
  banned_until: null,
};

function request(method: "PATCH" | "DELETE", body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/admin/team/member-1", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}

describe("professional team member route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authorize.mockResolvedValue({ ok: true, user: { id: "super-1", email: "direction@je-mange-africain.com", role: "super_admin" } });
    mocks.supabaseFetch.mockImplementation(async (_path: string, _key: string, _url: string, init?: RequestInit) => init?.method
      ? Response.json({ id: "member-1" })
      : Response.json(targetUser));
    mocks.updateMembership.mockResolvedValue({ count: 1 });
    mocks.deleteMembership.mockResolvedValue({ count: 1 });
    mocks.createAudit.mockResolvedValue({ id: "audit-1" });
  });

  it("refuses to modify the current governance account", async () => {
    const response = await PATCH(request("PATCH", { role: "support", status: "active", reason: "Changement de mission" }), { params: Promise.resolve({ id: "super-1" }) });
    expect(response.status).toBe(409);
    expect(mocks.supabaseFetch).not.toHaveBeenCalled();
  });

  it("protects every super administrator from delegated updates", async () => {
    mocks.supabaseFetch.mockResolvedValueOnce(Response.json({ ...targetUser, app_metadata: { role: "super_admin" } }));
    const response = await PATCH(request("PATCH", { role: "support", status: "active", reason: "Changement de mission" }), { params: Promise.resolve({ id: "member-1" }) });
    expect(response.status).toBe(409);
    expect(mocks.updateMembership).not.toHaveBeenCalled();
    expect(mocks.createAudit).not.toHaveBeenCalled();
  });

  it("records the previous and next access scope with its reason", async () => {
    const response = await PATCH(request("PATCH", { role: "support", status: "active", reason: "Renfort du service client" }), { params: Promise.resolve({ id: "member-1" }) });
    expect(response.status).toBe(200);
    expect(mocks.updateMembership).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ role: "support", status: "active" }) }));
    expect(mocks.createAudit).toHaveBeenCalledWith({ data: expect.objectContaining({
      action: "team_member_update",
      before: JSON.stringify({ role: "marketing", status: "active" }),
      after: JSON.stringify({ role: "support", status: "active" }),
      reason: "Renfort du service client · par direction@je-mange-africain.com",
    }) });
  });

  it("documents a permanent deletion before removing the membership", async () => {
    const response = await DELETE(request("DELETE", { reason: "Fin de mission confirmée" }), { params: Promise.resolve({ id: "member-1" }) });
    expect(response.status).toBe(200);
    expect(mocks.deleteMembership).toHaveBeenCalledWith({ where: { authUserId: "member-1" } });
    expect(mocks.createAudit).toHaveBeenCalledWith({ data: expect.objectContaining({
      action: "team_member_delete",
      before: JSON.stringify({ email: targetUser.email, role: "marketing", status: "active" }),
      reason: "Fin de mission confirmée · par direction@je-mange-africain.com",
    }) });
  });
});
