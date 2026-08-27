import Stripe from "stripe";

const secretKey = process.env.STRIPE_SECRET_KEY;

export const stripe = secretKey
  ? new Stripe(secretKey, {
      appInfo: { name: "Je mange Africain", version: "1.0.0", url: "https://je-mange-africain.com" },
      maxNetworkRetries: 2,
      timeout: 12_000,
    })
  : null;

export function stripeConfigurationError(locale: "fr" | "en" = "fr") {
  return locale === "fr"
    ? "Le paiement sécurisé n'est pas encore configuré. Aucune commande n'a été débitée."
    : "Secure payment is not configured yet. No order has been charged.";
}
