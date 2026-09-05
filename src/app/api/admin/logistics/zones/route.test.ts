import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  findCarrier: vi.fn(),
  createZone: vi.fn(),
  createAudit: vi.fn(),
}));

vi.mock("@/lib/admin-auth", () => ({ authorizeAdminRequest: mocks.authorize }));
vi.mock("@/lib/db", () => ({
  db: {
    carrier: { findUnique: mocks.findCarrier },
    deliveryZone: { create: mocks.createZone },
    auditLog: { create: mocks.createAudit },
  },
}));

import { POST } from "./route";

const zone = {
  carrierId: "carrier-express",
  country: "France",
  postalPattern: "75*",
  service: "express",
  baseFee: 4.9,
  perKgFee: 0.6,
  frozenSurcharge: 2.5,
  minDelayHours: 24,
};

function request(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/admin/logistics/zones", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}

describe("admin delivery zone creation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authorize.mockResolvedValue({ ok: true, user: { email: "logistique@je-mange-africain.com", role: "logistics" } });
    mocks.findCarrier.mockResolvedValue({ id: "carrier-express", name: "JMA Express" });
    mocks.createZone.mockResolvedValue({ id: "zone-1", ...zone });
    mocks.createAudit.mockResolvedValue({ id: "audit-1" });
  });

  it("creates an auditable route through the logistics permission", async () => {
    const response = await POST(request(zone));
    expect(response.status).toBe(201);
    expect(mocks.authorize).toHaveBeenCalledWith(expect.any(NextRequest), { module: "logistics", action: "create" });
    expect(mocks.createZone).toHaveBeenCalledWith({ data: expect.objectContaining({ carrierId: "carrier-express", postalPattern: "75*", minDelayHours: 24 }) });
    expect(mocks.createAudit).toHaveBeenCalledWith({ data: expect.objectContaining({ action: "delivery_zone_create", entityType: "DeliveryZone" }) });
  });

  it("rejects an incompatible service delay before touching the database", async () => {
    const response = await POST(request({ ...zone, minDelayHours: 72 }));
    expect(response.status).toBe(400);
    expect(mocks.findCarrier).not.toHaveBeenCalled();
    expect(mocks.createZone).not.toHaveBeenCalled();
  });

  it("rejects a carrier removed between form loading and publication", async () => {
    mocks.findCarrier.mockResolvedValueOnce(null);
    const response = await POST(request(zone));
    expect(response.status).toBe(409);
    expect(mocks.createZone).not.toHaveBeenCalled();
  });
});
