import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  constructEvent: vi.fn(),
  findPayment: vi.fn(),
  findEvent: vi.fn(),
  upsertRefund: vi.fn(),
  updatePayment: vi.fn(),
  updateOrder: vi.fn(),
  createEvent: vi.fn(),
  createAudit: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/stripe", () => ({ stripe: { webhooks: { constructEvent: mocks.constructEvent } } }));
vi.mock("@/lib/push-server", () => ({ sendPushToUser: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: {
    payment: { findFirst: mocks.findPayment },
    orderEvent: { findFirst: mocks.findEvent },
    notification: { create: vi.fn(), update: vi.fn() },
    $transaction: mocks.transaction,
  },
}));

import { POST } from "./route";

function request() {
  return new NextRequest("http://localhost/api/payments/webhook", { method: "POST", headers: { "stripe-signature": "signed" }, body: "payload" });
}

describe("Stripe refund webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    mocks.findPayment.mockResolvedValue({
      id: "payment-1",
      orderId: "order-1",
      amount: 48.7,
      status: "captured",
      reference: "pi_jma_1",
      order: { id: "order-1", status: "delivered", refunds: [{ id: "request-1", amount: 12.5, status: "pending", reason: "Incident" }], customer: { userId: null } },
    });
    mocks.transaction.mockImplementation(async (work: (transaction: unknown) => Promise<void>) => work({
      refund: { upsert: mocks.upsertRefund },
      payment: { update: mocks.updatePayment },
      order: { update: mocks.updateOrder },
      orderEvent: { create: mocks.createEvent },
      auditLog: { create: mocks.createAudit },
    }));
  });

  it("completes a pending partial refund without changing fulfilment state", async () => {
    mocks.constructEvent.mockReturnValue({
      type: "refund.updated",
      data: { object: { id: "re_1", amount: 1250, status: "succeeded", payment_intent: "pi_jma_1", metadata: { request_id: "request-1", internal_reason: "delivery_incident" } } },
    });
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(mocks.upsertRefund).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "request-1" }, update: expect.objectContaining({ amount: 12.5, status: "completed" }) }));
    expect(mocks.updatePayment).not.toHaveBeenCalled();
    expect(mocks.updateOrder).not.toHaveBeenCalled();
    expect(mocks.createEvent).toHaveBeenCalledWith({ data: expect.objectContaining({ status: "refund_completed", actor: "stripe" }) });
  });

  it("closes the payment and order after the provider confirms the full balance", async () => {
    mocks.findPayment.mockResolvedValue({
      id: "payment-1",
      orderId: "order-1",
      amount: 48.7,
      status: "captured",
      reference: "pi_jma_1",
      order: { id: "order-1", status: "delivered", refunds: [{ id: "request-1", amount: 48.7, status: "pending", reason: "Client" }], customer: { userId: null } },
    });
    mocks.constructEvent.mockReturnValue({
      type: "refund.updated",
      data: { object: { id: "re_2", amount: 4870, status: "succeeded", payment_intent: "pi_jma_1", metadata: { request_id: "request-1" } } },
    });
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(mocks.updatePayment).toHaveBeenCalledWith({ where: { id: "payment-1" }, data: { status: "refunded" } });
    expect(mocks.updateOrder).toHaveBeenCalledWith({ where: { id: "order-1" }, data: { status: "refunded" } });
    expect(mocks.createAudit).toHaveBeenCalledWith({ data: expect.objectContaining({ action: "payment_refund_provider_update" }) });
  });
});
