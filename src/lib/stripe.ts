import Stripe from "stripe";

export const paymentsEnabled = process.env.PAYMENTS_ENABLED === "true";
const secretKey = process.env.STRIPE_SECRET_KEY;

export const stripe = paymentsEnabled && secretKey
  ? new Stripe(secretKey, {
      appInfo: { name: "Je mange Africain", version: "1.0.0", url: "https://je-mange-africain.com" },
      maxNetworkRetries: 2,
      timeout: 12_000,
    })
  : null;

export function stripeConfigurationError(locale: "fr" | "en" = "fr") {
  if (!paymentsEnabled) {
    return locale === "fr"
      ? "Le paiement est temporairement désactivé. Aucune commande n'a été débitée ni validée."
      : "Payment is temporarily disabled. No order has been charged or confirmed.";
  }
  return locale === "fr"
    ? "Le paiement sécurisé n'est pas encore configuré. Aucune commande n'a été débitée."
    : "Secure payment is not configured yet. No order has been charged.";
}
