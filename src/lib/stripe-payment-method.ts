import type Stripe from "stripe";

type PaymentIntentMethodSource = Pick<Stripe.PaymentIntent, "latest_charge" | "payment_method" | "payment_method_types">;

export function paymentMethodUsed(intent: PaymentIntentMethodSource) {
  const latestCharge = intent.latest_charge;
  if (latestCharge && typeof latestCharge !== "string") {
    const chargedWallet = walletType(latestCharge.payment_method_details);
    if (chargedWallet) return chargedWallet;
    const chargedMethod = latestCharge.payment_method_details?.type;
    if (chargedMethod) return chargedMethod;
  }

  if (intent.payment_method && typeof intent.payment_method !== "string") {
    return walletType(intent.payment_method) || intent.payment_method.type;
  }

  return intent.payment_method_types.length === 1 ? intent.payment_method_types[0] : "unknown";
}

function walletType(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const card = (value as { card?: unknown }).card;
  if (!card || typeof card !== "object") return null;
  const wallet = (card as { wallet?: unknown }).wallet;
  if (!wallet || typeof wallet !== "object") return null;
  const type = (wallet as { type?: unknown }).type;
  return typeof type === "string" && type ? type : null;
}
