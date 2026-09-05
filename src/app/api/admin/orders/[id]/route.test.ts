import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  findOrder: vi.fn(),
  findUpdatedOrder: vi.fn(),
  transaction: vi.fn(),
  findCarrier: vi.fn(),
  createCarrier: vi.fn(),
  updateShipment: vi.fn(),
  createShipment: vi.fn(),
  updateShipments: vi.fn(),
  createEvent: vi.fn(),
  updateOrder: vi.fn(),
  createAudit: vi.fn(),
}));

vi.mock("@/lib/admin-auth", () => ({ authorizeAdminRequest: mocks.authorize }));
vi.mock("@/lib/push-server", () => ({ sendPushToUser: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: {
    order: { findUnique: mocks.findOrder, findUniqueOrThrow: mocks.findUpdatedOrder },
    notification: { create: vi.fn(), update: vi.fn() },
    $transaction: mocks.transaction,
  },
}));

import { PATCH } from "@/app/api/admin/orders/[id]/route";

const existingShipment = {
  id: "shipment-fresh",
  carrierId: "carrier-fresh",
  carrier: { name: "Chrono Frais", trackingUrl: "https://track.example.test/{ref}" },
  thermalClass: "REFRIGERATED",
  trackingNumber: "JMA-FRESH-001",
  estimatedDelivery: new Date("2026-09-08T12:00:00.000Z"),
  actualDelivery: null,
  confirmCode: null,
  proofPhoto: null,
  signature: null,
  status: "created",
};

function request(shipment: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/admin/orders/order-1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ locale: "fr", shipment }),
  });
}

describe("admin order parcel orchestration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authorize.mockResolvedValue({ ok: true, user: { email: "direction@je-mange-africain.com" } });
    mocks.findOrder.mockResolvedValue({
      id: "order-1",
      number: "JMA-260905-001",
      status: "preparing",
      notes: null,
      carrierId: "carrier-fresh",
      items: [{ thermalClass: "REFRIGERATED" }],
      shipments: [existingShipment],
      customer: { userId: null },
    });
    mocks.findCarrier.mockResolvedValue({ id: "carrier-ambient", name: "DPD Europe" });
    mocks.createShipment.mockResolvedValue({ id: "shipment-ambient" });
    mocks.findUpdatedOrder.mockResolvedValue({
      status: "preparing",
      notes: null,
      shipments: [existingShipment, { ...existingShipment, id: "shipment-ambient", thermalClass: "AMBIANT", carrier: { name: "DPD Europe", trackingUrl: null }, trackingNumber: "JMA-AMBIENT-002" }],
      timeline: [],
    });
    mocks.transaction.mockImplementation(async (work: (transaction: unknown) => Promise<void>) => work({
      carrier: { findFirst: mocks.findCarrier, create: mocks.createCarrier },
      shipment: { update: mocks.updateShipment, create: mocks.createShipment, updateMany: mocks.updateShipments },
      orderEvent: { create: mocks.createEvent },
      order: { update: mocks.updateOrder },
      auditLog: { create: mocks.createAudit },
    }));
  });

  it("creates a distinct parcel when the new-parcel option has no shipment id", async () => {
    const response = await PATCH(request({
      thermalClass: "AMBIANT",
      carrier: "DPD Europe",
      trackingNumber: "JMA-AMBIENT-002",
      estimatedDelivery: "2026-09-09T12:00:00.000Z",
      confirmCode: "7391",
      proofPhoto: "",
      signature: "",
    }), { params: Promise.resolve({ id: "order-1" }) });

    expect(response.status).toBe(200);
    expect(mocks.updateShipment).not.toHaveBeenCalled();
    expect(mocks.createShipment).toHaveBeenCalledWith({ data: expect.objectContaining({
      orderId: "order-1",
      thermalClass: "AMBIANT",
      carrierId: "carrier-ambient",
      trackingNumber: "JMA-AMBIENT-002",
    }) });
    expect(await response.json()).toMatchObject({ updatedShipmentId: "shipment-ambient", order: { shipments: [{ id: "shipment-fresh" }, { id: "shipment-ambient" }] } });
  });
});
