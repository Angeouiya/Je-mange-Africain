import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  findCarrier: vi.fn(),
  createAudit: vi.fn(),
  deleteCarrier: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/admin-auth", () => ({ authorizeAdminRequest: mocks.authorize }));
vi.mock("@/lib/db", () => ({
  db: {
    carrier: { findUnique: mocks.findCarrier, delete: mocks.deleteCarrier, findFirst: vi.fn(), update: vi.fn() },
    auditLog: { create: mocks.createAudit },
    $transaction: mocks.transaction,
  },
}));

import { DELETE } from "./route";

const request = new NextRequest("http://localhost/api/admin/logistics/carriers/carrier-1", { method: "DELETE" });
const context = { params: Promise.resolve({ id: "carrier-1" }) };

describe("admin carrier deletion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authorize.mockResolvedValue({ ok: true, user: { email: "direction@je-mange-africain.com", role: "super_admin" } });
    mocks.createAudit.mockReturnValue({ operation: "audit" });
    mocks.deleteCarrier.mockReturnValue({ operation: "delete" });
    mocks.transaction.mockResolvedValue([]);
  });

  it("preserves a carrier referenced by operational history", async () => {
    mocks.findCarrier.mockResolvedValue({ id: "carrier-1", name: "Chrono Frais", _count: { shipments: 12, zones: 0 } });
    const response = await DELETE(request, context);
    expect(response.status).toBe(409);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("deletes an unused carrier and its audit evidence atomically", async () => {
    mocks.findCarrier.mockResolvedValue({ id: "carrier-1", name: "Nouveau transporteur", _count: { shipments: 0, zones: 0 } });
    const response = await DELETE(request, context);
    expect(response.status).toBe(200);
    expect(mocks.createAudit).toHaveBeenCalledWith({ data: expect.objectContaining({ action: "carrier_delete", entityId: "carrier-1" }) });
    expect(mocks.transaction).toHaveBeenCalledWith([{ operation: "audit" }, { operation: "delete" }]);
  });
});
