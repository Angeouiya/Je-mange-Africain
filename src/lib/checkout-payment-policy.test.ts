import { describe, expect, it } from "vitest";
import { CHECKOUT_DELAYED_PAYMENT_METHODS, buildCheckoutPaymentPolicy, isImmediateCheckoutMethod, paypalPreferredLocale } from "./checkout-payment-policy";

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

  it("opens PayPal in the language selected by the customer", () => {
    expect(paypalPreferredLocale("fr", "FR")).toBe("fr-FR");
    expect(paypalPreferredLocale("fr", "BE")).toBe("fr-BE");
    expect(paypalPreferredLocale("fr", "LU")).toBe("fr-LU");
    expect(paypalPreferredLocale("en", "DE")).toBe("en-GB");
  });

  it("builds a server-readable European policy for the current intent", () => {
    const policy = buildCheckoutPaymentPolicy({
      country: "Pays-Bas",
      countryCode: "NL",
      locale: "fr",
      providerMethodTypes: ["card", "paypal", "sepa_debit", "ideal", "card"],
    });

    expect(policy).toMatchObject({
      country: "Pays-Bas",
      countryCode: "NL",
      settlementMode: "immediate",
      paypalPreferredLocale: "fr-FR",
      providerMethodTypes: ["card", "paypal", "ideal"],
      recommendedMethodTypes: ["card", "paypal", "link", "revolut_pay", "ideal"],
      serverControls: {
        authenticationRequired: true,
        pricingFingerprintRequired: true,
        deliveryFingerprintRequired: true,
        fraudScreeningRequired: true,
        confirmedIntentRequired: true,
        delayedMethodsBlocked: true,
      },
    });
    expect(policy.blockedDelayedMethodTypes).toContain("sepa_debit");
    expect(policy.providerMethodTypes).not.toContain("sepa_debit");
  });
});
