import { describe, expect, it } from "vitest";
import { paymentMethodFamily, paymentMethodFamilyLabel, paymentMethodHint, paymentMethodKey, paymentMethodLabel, paymentStatusLabel, uniquePaymentMethods } from "./payment-methods";

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

  it("translates provider statuses without leaking their technical codes", () => {
    expect(paymentStatusLabel("requires_action", "fr")).toBe("Action requise");
    expect(paymentStatusLabel("authorized", "en")).toBe("Authorised");
    expect(paymentStatusLabel("refunded", "fr")).toBe("Remboursé");
  });
});
