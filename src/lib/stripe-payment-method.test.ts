import { describe, expect, it } from "vitest";
import { paymentMethodUsed } from "./stripe-payment-method";

describe("Stripe payment method resolution", () => {
  it("uses the expanded payment method selected by the customer", () => {
    expect(paymentMethodUsed({
      payment_method: { type: "paypal" },
      payment_method_types: ["card", "paypal"],
      latest_charge: null,
    } as never)).toBe("paypal");
  });

  it("falls back to the expanded charge details", () => {
    expect(paymentMethodUsed({
      payment_method: "pm_123",
      payment_method_types: ["card", "paypal"],
      latest_charge: { payment_method_details: { type: "card" } },
    } as never)).toBe("card");
  });

  it("preserves the wallet used behind a card payment", () => {
    expect(paymentMethodUsed({
      payment_method: { type: "card", card: { wallet: { type: "apple_pay" } } },
      payment_method_types: ["card", "paypal"],
      latest_charge: { payment_method_details: { type: "card", card: { wallet: { type: "google_pay" } } } },
    } as never)).toBe("google_pay");
  });

  it("does not mislabel the first dynamic option as the selected method", () => {
    expect(paymentMethodUsed({
      payment_method: null,
      payment_method_types: ["card", "paypal"],
      latest_charge: null,
    } as never)).toBe("unknown");
  });
});
