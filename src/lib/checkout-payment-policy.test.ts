import { describe, expect, it } from "vitest";
import { CHECKOUT_DELAYED_PAYMENT_METHODS, isImmediateCheckoutMethod } from "./checkout-payment-policy";

describe("checkout payment policy", () => {
  it("keeps immediately confirmed European methods available", () => {
    for (const method of ["card", "paypal", "ideal", "bancontact", "eps", "p24", "revolut_pay", "klarna"]) {
      expect(isImmediateCheckoutMethod(method)).toBe(true);
    }
  });

  it("excludes methods that require a delayed order workflow", () => {
    expect(CHECKOUT_DELAYED_PAYMENT_METHODS).toContain("sepa_debit");
    expect(CHECKOUT_DELAYED_PAYMENT_METHODS).toContain("customer_balance");
    expect(isImmediateCheckoutMethod("sepa_debit")).toBe(false);
  });
});
