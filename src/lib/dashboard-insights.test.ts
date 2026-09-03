import { describe, expect, it } from "vitest";
import { buildDailyPulse, groupOrderWorkflow, netOrderRevenue, rankTopProducts, summarizeRevenueWindow, type DashboardOrderInput } from "@/lib/dashboard-insights";

function order(overrides: Partial<DashboardOrderInput> = {}): DashboardOrderInput {
  return {
    id: "order-1",
    status: "delivered",
    total: 50,
    createdAt: "2026-09-03T10:00:00.000Z",
    payments: [{ status: "captured", amount: 50 }],
    items: [{ productId: "attieke", nameFr: "Attiéké", nameEn: "Attieke", qty: 2, lineTotal: 20, imageUrl: "/attieke.webp" }],
    ...overrides,
  };
}

describe("dashboard insights", () => {
  it("uses net captured revenue and excludes cancelled business", () => {
    expect(netOrderRevenue(order({ payments: [{ status: "captured", amount: 50 }, { status: "refunded", amount: 12 }] }))).toBe(38);
    expect(netOrderRevenue(order({ status: "cancelled" }))).toBe(0);
    expect(netOrderRevenue(order({ status: "preparing", payments: [] }))).toBe(50);
    expect(summarizeRevenueWindow([order(), order({ id: "order-2", total: 30, payments: [{ status: "captured", amount: 30 }] })])).toEqual({ revenue: 80, orders: 2, averageBasket: 40 });
  });

  it("builds a stable seven-day pulse without counting unpaid orders", () => {
    const pulse = buildDailyPulse([
      order(),
      order({ id: "order-2", createdAt: "2026-09-01T08:00:00.000Z", total: 25, payments: [{ status: "captured", amount: 25 }] }),
      order({ id: "order-month-edge", createdAt: "2026-08-31T20:00:00.000Z", total: 18, payments: [{ status: "captured", amount: 18 }] }),
      order({ id: "order-3", status: "paymentPending", payments: [] }),
    ], new Date("2026-09-03T18:00:00.000Z"), "fr");

    expect(pulse).toHaveLength(7);
    expect(pulse.at(-1)).toMatchObject({ revenue: 50, orders: 1 });
    expect(pulse.find((day) => day.date.startsWith("2026-09-01"))).toMatchObject({ revenue: 25, orders: 1 });
    expect(pulse.find((day) => day.date.startsWith("2026-08-31"))).toMatchObject({ revenue: 18, orders: 1 });
  });

  it("groups the workflow and ranks products by physical units", () => {
    expect(groupOrderWorkflow({ paymentConfirmed: 2, preparing: 3, in_transit: 4, delivered: 5, cancelled: 1 })).toEqual([
      { id: "validate", count: 2 },
      { id: "prepare", count: 3 },
      { id: "deliver", count: 4 },
      { id: "closed", count: 6 },
    ]);

    const ranked = rankTopProducts([
      order(),
      order({ id: "order-2", items: [{ productId: "plantain", nameFr: "Plantain", nameEn: "Plantain", qty: 1, unitsPerPack: 6, lineTotal: 30 }] }),
    ], "fr");
    expect(ranked.map((product) => [product.productId, product.units])).toEqual([["plantain", 6], ["attieke", 2]]);
  });
});
