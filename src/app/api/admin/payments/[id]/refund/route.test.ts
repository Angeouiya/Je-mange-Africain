import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  findPayment: vi.fn(),
  createRefundRecord: vi.fn(),
  findRefundRecord: vi.fn(),
  createProviderRefund: vi.fn(),
  updateRefund: vi.fn(),
  updatePayment: vi.fn(),
  updateOrder: vi.fn(),
  createEvent: vi.fn(),
  createAudit: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/admin-auth", () => ({ authorizeAdminRequest: mocks.authorize }));
vi.mock("@/lib/push-server", () => ({ sendPushToUser: vi.fn() }));
vi.mock("@/lib/stripe", () => ({
  stripe: { refunds: { create: mocks.createProviderRefund } },
  stripeConfigurationError: () => "Stripe unavailable",
}));
vi.mock("@/lib/db", () => ({
  db: {
    payment: { findUnique: mocks.findPayment },
    refund: { create: mocks.createRefundRecord, findUnique: mocks.findRefundRecord },
    notification: { create: vi.fn(), update: vi.fn() },
    $transaction: mocks.transaction,
  },
}));

import { POST } from "./route";

const context = { params: Promise.resolve({ id: "payment-1" }) };
const requestId = "32edee58-7e59-4e11-98d7-df9d51f0f270";

function request(amount: number) {
  return new NextRequest("http://localhost/api/admin/payments/payment-1/refund", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "192.0.2.4" },
    body: JSON.stringify({ amount, reason: "delivery_incident", note: "Rupture de la chaîne du froid confirmée.", requestId, locale: "fr" }),
  });
}

function payment(refunds: Array<{ id: string; amount: number; status: string; reason: string }> = []) {
  return {
    id: "payment-1",
    orderId: "order-1",
    amount: 48.7,
    status: "captured",
    reference: "pi_jma_260902",
    order: { id: "order-1", status: "delivered", refunds, customer: { userId: null } },
  };
}

describe("admin payment refund", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authorize.mockResolvedValue({ ok: true, user: { email: "finance@je-mange-africain.com" } });
    mocks.findPayment.mockResolvedValue(payment());
    mocks.createRefundRecord.mockResolvedValue({ id: requestId });
    mocks.createProviderRefund.mockResolvedValue({ id: "re_jma_1", status: "succeeded" });
    mocks.transaction.mockImplementation(async (work: (transaction: unknown) => Promise<void>) => work({
      refund: { update: mocks.updateRefund },
      payment: { update: mocks.updatePayment },
      order: { update: mocks.updateOrder },
      orderEvent: { create: mocks.createEvent },
      auditLog: { create: mocks.createAudit },
    }));
  });

  it("records a partial refund without closing the delivered order", async () => {
    const response = await POST(request(12.5), context);
    expect(response.status).toBe(200);
    expect(mocks.createProviderRefund).toHaveBeenCalledWith(expect.objectContaining({
      payment_intent: "pi_jma_260902",
      amount: 1250,
      metadata: expect.objectContaining({ request_id: requestId, payment_id: "payment-1" }),
    }), { idempotencyKey: `jma-admin-refund:${requestId}` });
    expect(mocks.updatePayment).not.toHaveBeenCalled();
    expect(mocks.updateOrder).not.toHaveBeenCalled();
    expect(mocks.createAudit).toHaveBeenCalledWith({ data: expect.objectContaining({ action: "payment_refund_update", entityId: "payment-1" }) });
    expect(await response.json()).toMatchObject({ refund: { amount: 12.5, status: "completed" }, payment: { refundable: 36.2 }, order: { status: "delivered" } });
  });

  it("closes the order only after a complete confirmed refund", async () => {
    const response = await POST(request(48.7), context);
    expect(response.status).toBe(200);
    expect(mocks.updatePayment).toHaveBeenCalledWith({ where: { id: "payment-1" }, data: { status: "refunded" } });
    expect(mocks.updateOrder).toHaveBeenCalledWith({ where: { id: "order-1" }, data: { status: "refunded" } });
    expect(mocks.createEvent).toHaveBeenCalledWith({ data: expect.objectContaining({ status: "refunded" }) });
    expect(await response.json()).toMatchObject({ payment: { status: "refunded", refundable: 0 }, order: { status: "refunded" } });
  });

  it("rejects an amount above the remaining refundable balance before Stripe", async () => {
    mocks.findPayment.mockResolvedValue(payment([{ id: "refund-previous", amount: 20, status: "completed", reason: "Previous" }]));
    const response = await POST(request(30), context);
    expect(response.status).toBe(409);
    expect(mocks.createProviderRefund).not.toHaveBeenCalled();
    expect(mocks.createRefundRecord).not.toHaveBeenCalled();
    expect(await response.json()).toMatchObject({ refundableAmount: 28.7 });
  });
});
