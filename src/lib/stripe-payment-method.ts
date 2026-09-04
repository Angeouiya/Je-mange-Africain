import type Stripe from "stripe";

type PaymentIntentMethodSource = Pick<Stripe.PaymentIntent, "latest_charge" | "payment_method" | "payment_method_types">;

export function paymentMethodUsed(intent: PaymentIntentMethodSource) {
  if (intent.payment_method && typeof intent.payment_method !== "string") return intent.payment_method.type;

  const latestCharge = intent.latest_charge;
  if (latestCharge && typeof latestCharge !== "string") {
    const chargedMethod = latestCharge.payment_method_details?.type;
    if (chargedMethod) return chargedMethod;
  }

  return intent.payment_method_types.length === 1 ? intent.payment_method_types[0] : "unknown";
}
