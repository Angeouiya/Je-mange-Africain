import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  productFindMany: vi.fn(),
  productCount: vi.fn(),
  recipeCount: vi.fn(),
  promotionCount: vi.fn(),
  advertisementCount: vi.fn(),
  inventoryCount: vi.fn(),
  orderFindMany: vi.fn(),
  orderGroupBy: vi.fn(),
  orderCount: vi.fn(),
  paymentGroupBy: vi.fn(),
  customerCount: vi.fn(),
  shipmentCount: vi.fn(),
}));

vi.mock("@/lib/admin-auth", () => ({ authorizeAdminRequest: mocks.authorize }));
vi.mock("@/lib/db", () => ({
  db: {
    product: { findMany: mocks.productFindMany, count: mocks.productCount },
    recipe: { count: mocks.recipeCount },
    promotion: { count: mocks.promotionCount },
    advertisement: { count: mocks.advertisementCount },
    inventoryBatch: { count: mocks.inventoryCount },
    order: { findMany: mocks.orderFindMany, groupBy: mocks.orderGroupBy, count: mocks.orderCount },
    payment: { groupBy: mocks.paymentGroupBy },
    customer: { count: mocks.customerCount },
    shipment: { count: mocks.shipmentCount },
  },
}));

import { GET } from "@/app/api/admin/dashboard/route";

const currentOrder = {
  id: "order-current",
  number: "JMA-260903-001",
  status: "preparing",
  total: 100,
  createdAt: new Date("2026-09-03T09:00:00.000Z"),
  deliveryName: "Aminata Koné",
  deliveryCity: "Paris",
  deliveryCountry: "France",
  payments: [{ status: "captured", amount: 90 }],
  items: [{ id: "line-1", productId: "attieke", nameFr: "Attiéké", nameEn: "Attieke", qty: 2, unitsPerPack: 1, lineTotal: 80, imageUrl: "/attieke.webp" }],
};

const previousOrder = {
  ...currentOrder,
  id: "order-previous",
  number: "JMA-260802-001",
  total: 50,
  createdAt: new Date("2026-08-02T09:00:00.000Z"),
  payments: [{ status: "captured", amount: 50 }],
};

describe("GET /api/admin/dashboard", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-03T12:00:00.000Z"));
    mocks.authorize.mockResolvedValue({ ok: true, user: { id: "admin-1", email: "direction@example.com", role: "super_admin" } });
    mocks.productFindMany.mockResolvedValue([{ id: "available", stockQty: 10, reservedQty: 2, alertThreshold: 3 }, { id: "empty", stockQty: 2, reservedQty: 2, alertThreshold: 3 }]);
    mocks.productCount.mockResolvedValue(1);
    mocks.recipeCount.mockResolvedValueOnce(12).mockResolvedValueOnce(10).mockResolvedValueOnce(1);
    mocks.promotionCount.mockResolvedValue(3);
    mocks.advertisementCount.mockResolvedValue(2);
    mocks.inventoryCount.mockResolvedValueOnce(2).mockResolvedValueOnce(1);
    mocks.orderFindMany.mockResolvedValueOnce([currentOrder, previousOrder]).mockResolvedValueOnce([currentOrder]);
    mocks.orderGroupBy.mockResolvedValue([
      { status: "paymentConfirmed", _count: { status: 3 } },
      { status: "preparing", _count: { status: 2 } },
      { status: "in_transit", _count: { status: 1 } },
      { status: "delivered", _count: { status: 5 } },
    ]);
    mocks.paymentGroupBy.mockResolvedValue([{ status: "pending", _count: { status: 2 } }, { status: "failed", _count: { status: 1 } }]);
    mocks.customerCount.mockResolvedValueOnce(100).mockResolvedValueOnce(4);
    mocks.shipmentCount.mockResolvedValueOnce(2).mockResolvedValueOnce(1);
    mocks.orderCount.mockResolvedValue(1);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("returns a traceable decision cockpit from operational data", async () => {
    const response = await GET(new NextRequest("http://localhost/api/admin/dashboard?locale=fr"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.kpis).toMatchObject({
      revenueToday: 90,
      revenueMonth: 90,
      monthOrders: 1,
      activeOrders: 6,
      inDelivery: 1,
      paymentAttention: 3,
      stockCoverageRate: 50,
      outOfStock: 1,
      newCustomersMonth: 4,
    });
    expect(payload.comparison).toEqual({ revenue: 80, orders: 0, averageBasket: 80 });
    expect(payload.storefront).toEqual({
      publishedProducts: 2,
      availableProducts: 1,
      productsMissingImages: 1,
      publishedRecipes: 12,
      purchasableRecipes: 10,
      recipesMissingImages: 1,
      activePromotions: 3,
      liveAdvertisements: 2,
    });
    expect(payload.pulse).toHaveLength(7);
    expect(payload.pulse.at(-1)).toMatchObject({ revenue: 90, orders: 1 });
    expect(payload.workflow).toEqual([
      { id: "validate", count: 3 },
      { id: "prepare", count: 2 },
      { id: "deliver", count: 1 },
      { id: "closed", count: 5 },
    ]);
    expect(payload.priorities).toHaveLength(9);
    expect(payload.recentOrders[0]).toMatchObject({ number: "JMA-260903-001", itemCount: 2, imageUrl: "/attieke.webp" });
    expect(payload.topProducts[0]).toMatchObject({ productId: "attieke", units: 2, revenue: 72 });
  });
});
