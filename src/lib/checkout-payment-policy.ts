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
