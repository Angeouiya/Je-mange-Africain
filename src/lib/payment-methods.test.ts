import { describe, expect, it } from "vitest";
import { availableExpressPaymentMethods, checkoutPaymentMethodSummary, paymentMethodFamily, paymentMethodFamilyLabel, paymentMethodHint, paymentMethodKey, paymentMethodLabel, paymentStatusLabel, summarizePaymentMethods, uniquePaymentMethods } from "./payment-methods";

describe("payment method presentation", () => {
  it("keeps European payment methods readable in both languages", () => {
    expect(paymentMethodLabel("sepa_debit", "fr")).toBe("Prélèvement SEPA");
    expect(paymentMethodLabel("ideal", "en")).toBe("iDEAL");
    expect(paymentMethodLabel("bancontact", "fr")).toBe("Bancontact");
    expect(paymentMethodHint("klarna", "fr")).toContain("éligibilité");
  });

  it("groups methods for consistent customer and administration icons", () => {
    expect(paymentMethodFamily("paypal")).toBe("wallet");
    expect(paymentMethodFamily("p24")).toBe("bank");
    expect(paymentMethodFamilyLabel("card", "fr")).toBe("Carte");
  });

  it("normalizes and deduplicates provider values", () => {
    expect(paymentMethodKey("Google   Pay")).toBe("google_pay");
    expect(uniquePaymentMethods(["card", "PayPal", "paypal", "sepa-debit"])).toEqual(["card", "paypal", "sepa_debit"]);
  });

  it("describes only the methods returned for this checkout", () => {
    expect(checkoutPaymentMethodSummary(undefined, "fr")).toBe("Moyens adaptés à votre pays");
    expect(checkoutPaymentMethodSummary(["card", "paypal", "ideal"], "fr")).toBe("Carte bancaire, PayPal, iDEAL");
    expect(checkoutPaymentMethodSummary(["card", "paypal", "ideal", "bancontact"], "en")).toBe("Payment card, PayPal, iDEAL +1");
  });

  it("translates provider statuses without leaking their technical codes", () => {
    expect(paymentStatusLabel("requires_action", "fr")).toBe("Action requise");
    expect(paymentStatusLabel("authorized", "en")).toBe("Authorised");
    expect(paymentStatusLabel("refunded", "fr")).toBe("Remboursé");
  });

  it("exposes only express methods that are available on the current device", () => {
    expect(availableExpressPaymentMethods({ paypal: true, applePay: false, googlePay: true, link: true })).toEqual(["google_pay", "link", "paypal"]);
    expect(availableExpressPaymentMethods(undefined)).toEqual([]);
  });

  it("summarizes collected revenue by normalized payment method", () => {
    const summary = summarizePaymentMethods([
      { method: "PayPal", amount: 65 },
      { method: "paypal", amount: 35 },
      { method: "card", amount: 50 },
    ]);

    expect(summary).toMatchObject([
      { method: "paypal", family: "wallet", count: 2, amount: 100 },
      { method: "card", family: "card", count: 1, amount: 50 },
    ]);
    expect(summary[0].share).toBeCloseTo(66.67, 2);
    expect(summary[1].share).toBeCloseTo(33.33, 2);
  });
});
