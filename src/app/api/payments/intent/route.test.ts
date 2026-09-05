import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  authorizeCustomerRequest: vi.fn(),
  enforceRateLimit: vi.fn(),
  priceCheckout: vi.fn(),
  createIntent: vi.fn(),
}));

vi.mock("@/lib/customer-auth", () => ({ authorizeCustomerRequest: mocks.authorizeCustomerRequest }));
vi.mock("@/lib/redis", () => ({ enforceRateLimit: mocks.enforceRateLimit, redis: null }));
vi.mock("@/lib/checkout-pricing", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/checkout-pricing")>();
  return { ...actual, priceCheckout: mocks.priceCheckout };
});
vi.mock("@/lib/stripe", () => ({
  stripe: { paymentIntents: { create: mocks.createIntent } },
  stripeConfigurationError: () => "Stripe unavailable",
}));

import { CHECKOUT_DELAYED_PAYMENT_METHODS } from "@/lib/checkout-payment-policy";
import { POST } from "./route";

const session = { id: "customer-auth-eu", email: "awa@example.fr" };
const body = {
  items: [{ productId: "product-1", qty: 2 }],
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
  coupon: null,
  locale: "fr",
  checkoutAttemptId: "2ddfe2cb-1cca-4fef-bf56-2b9a45609dd7",
};

describe("POST /api/payments/intent European payment policy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authorizeCustomerRequest.mockResolvedValue(session);
    mocks.enforceRateLimit.mockResolvedValue(null);
    mocks.priceCheckout.mockResolvedValue({
      validatedItems: [{ qty: 2, unitsPerPack: 1 }],
      total: 48.7,
      subtotal: 41.8,
      promoDiscount: 0,
      shipping: 6.9,
      vat: 6.97,
      thermalClasses: ["AMBIANT"],
      fingerprint: "cart-fingerprint",
      shippingQuote: { carrier: "DPD Europe", service: "standard", minDelayHours: 48, maxDelayHours: 72 },
    });
    mocks.createIntent.mockResolvedValue({
      id: "pi_europe_42",
      client_secret: "pi_europe_42_secret",
      payment_method_types: ["card", "paypal", "ideal"],
    });
  });

  it("creates an idempotent intent with immediate methods and blocks delayed debit methods", async () => {
    const request = new NextRequest("http://localhost/api/payments/intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.paymentMethodTypes).toEqual(["card", "paypal", "ideal"]);
    expect(mocks.createIntent).toHaveBeenCalledWith(expect.objectContaining({
      amount: 4870,
      currency: "eur",
      automatic_payment_methods: { enabled: true },
      excluded_payment_method_types: [...CHECKOUT_DELAYED_PAYMENT_METHODS],
      receipt_email: session.email,
    }), { idempotencyKey: `jma:${session.id}:${body.checkoutAttemptId}` });

    const params = mocks.createIntent.mock.calls[0][0];
    expect(params.excluded_payment_method_types).not.toContain("card");
    expect(params.excluded_payment_method_types).not.toContain("paypal");
    expect(params.excluded_payment_method_types).toContain("sepa_debit");
  });
});
