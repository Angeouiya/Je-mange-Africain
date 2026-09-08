import { recommendedEuropeanPaymentMethods, uniquePaymentMethods } from "@/lib/payment-methods";

/**
 * Delayed-notification methods need an order-pending workflow before stock can
 * be fulfilled safely. Keep the live checkout on immediately confirmed methods.
 */
export const CHECKOUT_DELAYED_PAYMENT_METHODS = [
  "acss_debit",
  "au_becs_debit",
  "bacs_debit",
  "boleto",
  "customer_balance",
  "konbini",
  "nz_bank_account",
  "oxxo",
  "pay_by_bank",
  "sepa_debit",
  "us_bank_account",
] as const;

export function isImmediateCheckoutMethod(method: string) {
  return !CHECKOUT_DELAYED_PAYMENT_METHODS.includes(method as (typeof CHECKOUT_DELAYED_PAYMENT_METHODS)[number]);
}

export type PaypalPreferredLocale = "en-GB" | "fr-BE" | "fr-FR" | "fr-LU";

export function paypalPreferredLocale(locale: "fr" | "en", countryCode: string): PaypalPreferredLocale {
  if (locale === "en") return "en-GB";
  if (countryCode === "BE") return "fr-BE";
  if (countryCode === "LU") return "fr-LU";
  return "fr-FR";
}

export type CheckoutPaymentPolicy = {
  country: string;
  countryCode: string;
  settlementMode: "immediate";
  paypalPreferredLocale: PaypalPreferredLocale;
  providerMethodTypes: string[];
  recommendedMethodTypes: string[];
  blockedDelayedMethodTypes: string[];
  serverControls: {
    authenticationRequired: true;
    pricingFingerprintRequired: true;
    deliveryFingerprintRequired: true;
    fraudScreeningRequired: true;
    confirmedIntentRequired: true;
    delayedMethodsBlocked: true;
  };
};

export function buildCheckoutPaymentPolicy({
  country,
  countryCode,
  locale,
  providerMethodTypes,
}: {
  country: string;
  countryCode: string;
  locale: "fr" | "en";
  providerMethodTypes: readonly string[];
}): CheckoutPaymentPolicy {
  const providerMethods = uniquePaymentMethods(providerMethodTypes).filter(isImmediateCheckoutMethod);
  const recommendedMethods = recommendedEuropeanPaymentMethods(country).filter(isImmediateCheckoutMethod);

  return {
    country,
    countryCode,
    settlementMode: "immediate",
    paypalPreferredLocale: paypalPreferredLocale(locale, countryCode),
    providerMethodTypes: providerMethods,
    recommendedMethodTypes: recommendedMethods,
    blockedDelayedMethodTypes: [...CHECKOUT_DELAYED_PAYMENT_METHODS],
    serverControls: {
      authenticationRequired: true,
      pricingFingerprintRequired: true,
      deliveryFingerprintRequired: true,
      fraudScreeningRequired: true,
      confirmedIntentRequired: true,
      delayedMethodsBlocked: true,
    },
  };
}
