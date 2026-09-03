import { describe, expect, it } from "vitest";
import { getOrderDeliveryTimestamp, getOrderProgress, getOrderStageIndex, isTerminalOrder, orderNeedsAttention, summarizeOrders } from "@/lib/order-experience";
import type { Order } from "@/lib/types";

const order = (status: string, total: number, id = status): Order => ({
  id,
  number: `JMA-${id}`,
  status,
  subtotal: total,
  promoDiscount: 0,
  vatAmount: 0,
  shippingCost: 0,
  total,
  currency: "EUR",
  weightGrams: 0,
  packageCount: 1,
  deliveryName: "Awa Traoré",
  deliveryAddress: "12 rue de la Gare",
  deliveryCity: "Paris",
  deliveryPostalCode: "75011",
  deliveryCountry: "France",
  deliverySlot: "standard",
  paymentMethod: "card",
  createdAt: "2026-09-01T08:00:00.000Z",
  items: [],
  timeline: [],
  shipments: [],
  payments: [],
});

describe("order experience", () => {
  it("normalizes persisted statuses into a stable delivery progression", () => {
    expect(getOrderStageIndex("payment_confirmed")).toBe(0);
    expect(getOrderStageIndex("controlDone")).toBe(1);
    expect(getOrderStageIndex("in_transit")).toBe(2);
    expect(getOrderStageIndex("delivered")).toBe(3);
    expect(getOrderProgress("delivered")).toBe(100);
    expect(getOrderProgress("failed")).toBe(0);
  });

  it("separates attention states from active and terminal orders", () => {
    expect(orderNeedsAttention("awaiting_client")).toBe(true);
    expect(orderNeedsAttention("replacement")).toBe(true);
    expect(isTerminalOrder("failed")).toBe(true);
    expect(isTerminalOrder("in_transit")).toBe(false);
  });

  it("prioritizes a client action and excludes failed value from the portfolio", () => {
    const summary = summarizeOrders([
      order("in_transit", 42, "active"),
      order("delivered", 58, "delivered"),
      order("failed", 90, "failed"),
    ]);

    expect(summary).toMatchObject({ total: 3, active: 1, delivered: 1, attention: 1, orderedValue: 100 });
    expect(summary.focusOrder?.id).toBe("failed");
  });

  it("uses actual delivery evidence for delivered orders", () => {
    const delivered = order("delivered", 30);
    delivered.shipments = [{ id: "parcel", carrierId: null, carrierName: "Chrono Frais", trackingNumber: "JMA-1", thermalClass: "FROZEN", status: "delivered", confirmCode: null, estimatedDelivery: "2026-09-04T12:00:00.000Z", actualDelivery: "2026-09-03T16:30:00.000Z" }];

    expect(getOrderDeliveryTimestamp(delivered)).toBe("2026-09-03T16:30:00.000Z");
  });
});
