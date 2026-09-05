import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  paymentGroupBy: vi.fn(),
  paymentCount: vi.fn(),
  paymentFindMany: vi.fn(),
  refundGroupBy: vi.fn(),
  orderCount: vi.fn(),
  orderFindMany: vi.fn(),
}));

vi.mock("@/lib/admin-auth", () => ({ authorizeAdminRequest: mocks.authorize }));
vi.mock("@/lib/db", () => ({
  db: {
    payment: { groupBy: mocks.paymentGroupBy, count: mocks.paymentCount, findMany: mocks.paymentFindMany },
    refund: { groupBy: mocks.refundGroupBy },
    order: { count: mocks.orderCount, findMany: mocks.orderFindMany },
  },
}));

import { GET } from "@/app/api/admin/payments/route";

const payment = {
  id: "payment-1",
  amount: 48.7,
  method: "card",
  status: "captured",
  reference: "pi_jma_260902",
  createdAt: new Date("2026-09-02T10:00:00.000Z"),
  order: {
    id: "order-1",
    number: "JMA-260902-0142",
    status: "preparing",
    currency: "EUR",
    deliveryName: "Aminata Koné",
    deliveryEmail: "aminata@example.com",
    deliveryCountry: "France",
    refunds: [{ id: "refund-1", amount: 12.5, status: "completed", reason: "Incident de livraison", createdAt: new Date("2026-09-03T12:00:00.000Z") }],
    payments: [{ id: "payment-1" }],
  },
};

describe("GET /api/admin/payments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authorize.mockResolvedValue({ ok: true, user: { id: "admin-1", email: "finance@example.com", role: "accounting" } });
    mocks.paymentGroupBy.mockImplementation(({ by }: { by: string[] }) => by[0] === "status"
      ? Promise.resolve([
          { status: "captured", _count: { _all: 1 }, _sum: { amount: 48.7 } },
          { status: "pending", _count: { _all: 1 }, _sum: { amount: 21 } },
          { status: "failed", _count: { _all: 1 }, _sum: { amount: 15 } },
        ])
      : Promise.resolve([
          { method: "card", _count: { _all: 1 }, _sum: { amount: 48.7 } },
          { method: "paypal", _count: { _all: 1 }, _sum: { amount: 21 } },
          { method: "apple_pay", _count: { _all: 1 }, _sum: { amount: 15 } },
        ]));
    mocks.refundGroupBy.mockResolvedValue([
      { status: "completed", _count: { _all: 1 }, _sum: { amount: 12.5 } },
      { status: "pending", _count: { _all: 1 }, _sum: { amount: 5 } },
    ]);
    mocks.orderCount.mockResolvedValue(1);
    mocks.orderFindMany.mockImplementation((args: { where?: { refunds?: unknown }; select?: Record<string, unknown> }) => {
      if (args.where?.refunds) return Promise.resolve([{ payments: [{ id: "payment-1" }] }]);
      if (args.select?.deliveryCountry) return Promise.resolve([{ deliveryCountry: "Belgique" }, { deliveryCountry: "France" }]);
      if (args.select?.currency) return Promise.resolve([{ currency: "EUR" }]);
      return Promise.resolve([]);
    });
    mocks.paymentCount.mockResolvedValue(3);
    mocks.paymentFindMany.mockResolvedValue([payment]);
  });

  it("blocks callers without finance read access before querying the ledger", async () => {
    mocks.authorize.mockResolvedValueOnce({ ok: false, response: NextResponse.json({ error: "Accès refusé." }, { status: 403 }) });

    const response = await GET(new NextRequest("http://localhost/api/admin/payments"));

    expect(response.status).toBe(403);
    expect(mocks.paymentGroupBy).not.toHaveBeenCalled();
    expect(mocks.paymentFindMany).not.toHaveBeenCalled();
  });

  it("returns a bounded finance ledger with server-side totals and international coverage", async () => {
    const response = await GET(new NextRequest("http://localhost/api/admin/payments?locale=fr&period=30d&page=1&pageSize=24"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.authorize).toHaveBeenCalledWith(expect.any(NextRequest), { module: "finance", action: "read" });
    expect(payload.summary).toMatchObject({
      netCapturedAmount: 36.2,
      grossCapturedAmount: 48.7,
      capturedCount: 1,
      pendingAmount: 21,
      refundedAmount: 12.5,
      pendingRefundAmount: 5,
      exceptionAmount: 15,
    });
    expect(payload.summary.reconciliationRate).toBeCloseTo(33.333, 2);
    expect(payload.counts).toEqual({ all: 3, captured: 1, pending: 1, refunds: 1, exceptions: 1 });
    expect(payload.methods.map((method: { method: string }) => method.method)).toEqual(["card", "paypal", "apple_pay"]);
    expect(payload.coverage).toEqual({ countries: ["Belgique", "France"], currencies: ["EUR"], familyCount: 2 });
    expect(payload.rows[0]).toMatchObject({ id: "payment-1", orderNumber: "JMA-260902-0142", country: "France", refunds: [{ id: "refund-1", amount: 12.5 }] });
    expect(payload.pagination).toEqual({ page: 1, pageSize: 24, pageCount: 1, totalRows: 3, hasPrevious: false, hasNext: false });
    expect(mocks.paymentFindMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 0, take: 24 }));
  });

  it("reduces the refund view to one designated captured payment per order", async () => {
    mocks.paymentCount.mockResolvedValue(1);
    const response = await GET(new NextRequest("http://localhost/api/admin/payments?filter=refunds&period=all&page=1&pageSize=10"));

    expect(response.status).toBe(200);
    expect(mocks.paymentCount).toHaveBeenCalledWith({ where: { id: { in: ["payment-1"] } } });
    expect(mocks.paymentFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: { in: ["payment-1"] } }, take: 10 }));
  });

  it("rejects invalid pagination before reading finance data", async () => {
    const response = await GET(new NextRequest("http://localhost/api/admin/payments?pageSize=500"));

    expect(response.status).toBe(400);
    expect(mocks.paymentFindMany).not.toHaveBeenCalled();
  });
});
