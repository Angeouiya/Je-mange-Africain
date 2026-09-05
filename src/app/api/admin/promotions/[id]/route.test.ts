import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  audit: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/admin-auth", () => ({ authorizeAdminRequest: mocks.authorize }));
vi.mock("@/lib/db", () => ({
  db: {
    promotion: { findUnique: mocks.findUnique },
    $transaction: mocks.transaction,
  },
}));

import { DELETE, PATCH } from "./route";

const before = {
  id: "promotion-1",
  code: "BIENVENUE10",
  type: "percent",
  value: 10,
  minOrder: 30,
  appliesTo: "all",
  targetId: null,
  startsAt: null,
  endsAt: null,
  usageLimit: 100,
  usedCount: 12,
  active: true,
};

const params = { params: Promise.resolve({ id: before.id }) };
const request = (method: "PATCH" | "DELETE", body?: Record<string, unknown>) => new NextRequest(`http://localhost/api/admin/promotions/${before.id}`, {
  method,
  headers: body ? { "Content-Type": "application/json" } : undefined,
  body: body ? JSON.stringify(body) : undefined,
});

describe("admin promotion record", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authorize.mockResolvedValue({ ok: true, user: { email: "marketing@je-mange-africain.com", role: "marketing" } });
    mocks.findUnique.mockResolvedValue(before);
    mocks.update.mockResolvedValue({ ...before, active: false });
    mocks.remove.mockResolvedValue(before);
    mocks.audit.mockResolvedValue({ id: "audit-promotion-status" });
    mocks.transaction.mockImplementation(async (callback: (transaction: unknown) => unknown) => callback({ promotion: { update: mocks.update, delete: mocks.remove }, auditLog: { create: mocks.audit } }));
  });

  it("audits an immediate suspension through the marketing update permission", async () => {
    const response = await PATCH(request("PATCH", { ...before, active: false }), params);

    expect(response.status).toBe(200);
    expect(mocks.authorize).toHaveBeenCalledWith(expect.any(NextRequest), { module: "marketing", action: "update" });
    expect(mocks.update).toHaveBeenCalledWith({ where: { id: before.id }, data: expect.objectContaining({ code: before.code, active: false }) });
    expect(mocks.audit).toHaveBeenCalledWith({ data: expect.objectContaining({ action: "promotion_status_change", entityId: before.id, before: JSON.stringify(before) }) });
  });

  it("preserves a used promotion for commercial history", async () => {
    const response = await DELETE(request("DELETE"), params);
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.error).toContain("Suspendez-la");
    expect(mocks.authorize).toHaveBeenCalledWith(expect.any(NextRequest), { module: "marketing", action: "delete" });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("deletes and audits a code that has never been redeemed", async () => {
    mocks.findUnique.mockResolvedValueOnce({ ...before, usedCount: 0 });

    const response = await DELETE(request("DELETE"), params);

    expect(response.status).toBe(200);
    expect(mocks.remove).toHaveBeenCalledWith({ where: { id: before.id } });
    expect(mocks.audit).toHaveBeenCalledWith({ data: expect.objectContaining({ action: "promotion_delete", entityType: "Promotion" }) });
  });
});
