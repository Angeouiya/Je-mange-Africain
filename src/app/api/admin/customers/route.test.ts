import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ authorize: vi.fn(), customerFindMany: vi.fn(), orderGroupBy: vi.fn() }));

vi.mock("@/lib/admin-auth", () => ({ authorizeAdminRequest: mocks.authorize }));
vi.mock("@/lib/db", () => ({
  db: {
    customer: { findMany: mocks.customerFindMany },
    order: { groupBy: mocks.orderGroupBy },
  },
}));

import { GET } from "@/app/api/admin/customers/route";

describe("GET /api/admin/customers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-03T12:00:00.000Z"));
    mocks.authorize.mockResolvedValue({ ok: true, user: { id: "admin-1", role: "support" } });
    mocks.customerFindMany.mockResolvedValue([
      {
        id: "customer-1",
        loyaltyPoints: 1200,
        walletCredit: 12,
        preferredLang: "fr",
        createdAt: new Date("2025-10-01T10:00:00.000Z"),
        user: { email: "aminata@example.fr", firstName: "Aminata", lastName: "Koné", phone: "+33 6 00 00 00 00" },
        addresses: [{ city: "Paris", country: "France", phone: null }],
        _count: { addresses: 1, favorites: 2, savedRecipes: 1, tickets: 1 },
      },
      {
        id: "customer-2",
        loyaltyPoints: 100,
        walletCredit: 0,
        preferredLang: "en",
        createdAt: new Date("2025-11-01T10:00:00.000Z"),
        user: { email: "idrissa@example.be", firstName: "Idrissa", lastName: "Traoré", phone: "+32 470 00 00 00" },
        addresses: [{ city: "Bruxelles", country: "Belgique", phone: null }],
        _count: { addresses: 1, favorites: 0, savedRecipes: 0, tickets: 0 },
      },
    ]);
    mocks.orderGroupBy.mockResolvedValue([
      { customerId: "customer-1", _count: { _all: 5 }, _sum: { total: 350 }, _avg: { total: 70 }, _max: { createdAt: new Date("2026-08-30T10:00:00.000Z") } },
      { customerId: "customer-2", _count: { _all: 2 }, _sum: { total: 180 }, _avg: { total: 90 }, _max: { createdAt: new Date("2026-05-01T10:00:00.000Z") } },
    ]);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("returns portfolio health and a priority queue from commercial relationships", async () => {
    const response = await GET(new NextRequest("http://localhost/api/admin/customers?locale=fr"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.customers).toHaveLength(2);
    expect(payload.customers[0]).toMatchObject({ name: "Aminata Koné", segment: "ambassador", lifetimeValue: 350 });
    expect(payload.customers[1]).toMatchObject({ name: "Idrissa Traoré", segment: "at_risk", lifetimeValue: 180 });
    expect(payload.summary).toMatchObject({ total: 2, lifetimeValue: 530, totalOrders: 7, repeatRate: 100, profileCoverageRate: 100, markets: 2, actionable: 2 });
    expect(payload.actions.map((action: { kind: string }) => action.kind)).toEqual(["support", "reengage"]);
    expect(mocks.orderGroupBy.mock.calls[0][0].where.status.notIn).toEqual(["cart", "cancelled", "failed", "refunded"]);
  });
});
