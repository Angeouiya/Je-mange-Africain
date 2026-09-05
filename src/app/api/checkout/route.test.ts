import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  authorizeCustomerRequest: vi.fn(),
  enforceRateLimit: vi.fn(),
  priceCheckout: vi.fn(),
  paymentFindUnique: vi.fn(),
  retrieveIntent: vi.fn(),
  createRefund: vi.fn(),
}));

vi.mock("@/lib/customer-auth", () => ({ authorizeCustomerRequest: mocks.authorizeCustomerRequest }));
vi.mock("@/lib/redis", () => ({ enforceRateLimit: mocks.enforceRateLimit }));
vi.mock("@/lib/push-server", () => ({ sendPushToSubscriptionId: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: {
    payment: { findUnique: mocks.paymentFindUnique },
  },
}));
vi.mock("@/lib/stripe", () => ({
  stripe: {
    paymentIntents: { retrieve: mocks.retrieveIntent },
    refunds: { create: mocks.createRefund },
  },
  stripeConfigurationError: () => "Stripe unavailable",
}));
vi.mock("@/lib/checkout-pricing", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/checkout-pricing")>();
  return { ...actual, priceCheckout: mocks.priceCheckout };
});

import { CheckoutPricingError } from "@/lib/checkout-pricing";
import { POST } from "./route";

const session = { id: "customer-auth-1", email: "awa@example.fr" };
const paymentIntent = {
  id: "pi_checkout_42",
  status: "succeeded",
  amount_received: 4200,
  currency: "eur",
  metadata: { customer_auth_id: session.id },
  payment_method_types: ["card"],
  payment_method: null,
  latest_charge: null,
};
const body = {
  items: [{ productId: "product-1", variantId: "variant-800", qty: 1 }],
  address: {
    firstName: "Awa",
    lastName: "Traoré",
    email: session.email,
    street: "12 rue des Cultures",
    postalCode: "75011",
    city: "Paris",
    country: "France",
    phone: "+33612345678",
  },
  deliverySlot: "standard",
  paymentIntentId: paymentIntent.id,
  coupon: null,
  locale: "fr",
};

const request = () => new NextRequest("http://localhost/api/checkout", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

describe("POST /api/checkout payment recovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authorizeCustomerRequest.mockResolvedValue(session);
    mocks.enforceRateLimit.mockResolvedValue(null);
    mocks.retrieveIntent.mockResolvedValue(paymentIntent);
    mocks.paymentFindUnique.mockResolvedValue(null);
    mocks.createRefund.mockResolvedValue({ id: "re_checkout_42", status: "pending" });
  });

  it("returns an existing order before repricing an idempotent retry", async () => {
    mocks.paymentFindUnique.mockResolvedValue({
      order: { id: "order-42", number: "JMA-2026-0042", total: 42, status: "paymentConfirmed" },
    });

    const response = await POST(request());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ order: { id: "order-42" } });
    expect(mocks.priceCheckout).not.toHaveBeenCalled();
    expect(mocks.createRefund).not.toHaveBeenCalled();
  });

  it("starts one idempotent refund when stock changed after payment", async () => {
    mocks.priceCheckout.mockRejectedValue(new CheckoutPricingError("Le stock disponible a changé.", 409));

    const response = await POST(request());
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload).toMatchObject({
      paymentRecovery: { status: "refund_submitted", reference: "re_checkout_42", refundStatus: "pending" },
    });
    expect(mocks.createRefund).toHaveBeenCalledWith({
      payment_intent: paymentIntent.id,
      metadata: { source: "checkout_recovery", cause: "order_not_created" },
    }, { idempotencyKey: `jma:checkout-recovery:${paymentIntent.id}` });
  });

  it("keeps the payment in reconciliation when database state is ambiguous", async () => {
    mocks.paymentFindUnique.mockRejectedValue(new Error("database unavailable"));

    const response = await POST(request());
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload).toMatchObject({ paymentRecovery: { status: "finalization_pending", reference: paymentIntent.id } });
    expect(mocks.createRefund).not.toHaveBeenCalled();
  });

  it("does not refund when the concurrent-order verification fails", async () => {
    mocks.paymentFindUnique.mockResolvedValueOnce(null).mockRejectedValueOnce(new Error("database unavailable"));
    mocks.priceCheckout.mockRejectedValue(new CheckoutPricingError("Le stock disponible a changé.", 409));

    const response = await POST(request());
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload).toMatchObject({ paymentRecovery: { status: "finalization_pending", reference: paymentIntent.id } });
    expect(mocks.createRefund).not.toHaveBeenCalled();
  });

  it("never refunds a payment owned by another customer session", async () => {
    mocks.retrieveIntent.mockResolvedValue({ ...paymentIntent, metadata: { customer_auth_id: "another-customer" } });

    const response = await POST(request());

    expect(response.status).toBe(403);
    expect(mocks.paymentFindUnique).not.toHaveBeenCalled();
    expect(mocks.createRefund).not.toHaveBeenCalled();
  });
});
