import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !signature || !webhookSecret) {
    return NextResponse.json({ error: "Webhook Stripe non configuré." }, { status: 503 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await request.text(), signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Signature Stripe invalide." }, { status: 400 });
  }

  if (event.type === "payment_intent.payment_failed") {
    await updatePayment(event.data.object.id, "failed", "paymentFailed", "Paiement refusé");
  }
  if (event.type === "payment_intent.succeeded") {
    await updatePayment(event.data.object.id, "captured", "paymentConfirmed", "Paiement confirmé");
  }
  if (event.type === "charge.refunded") {
    const paymentIntent = event.data.object.payment_intent;
    const paymentIntentId = typeof paymentIntent === "string" ? paymentIntent : paymentIntent?.id;
    if (paymentIntentId) await updatePayment(paymentIntentId, "refunded", "refunded", "Paiement remboursé");
  }

  return NextResponse.json({ received: true });
}

async function updatePayment(reference: string, paymentStatus: string, orderStatus: string, label: string) {
  const payment = await db.payment.findFirst({ where: { reference }, include: { order: true } });
  if (!payment) return;
  const existingEvent = await db.orderEvent.findFirst({ where: { orderId: payment.orderId, status: orderStatus, actor: "stripe" } });
  const preserveRiskReview = orderStatus === "paymentConfirmed" && payment.order.status === "fraudCheck";
  await db.$transaction(async (tx) => {
    if (payment.status !== paymentStatus) await tx.payment.update({ where: { id: payment.id }, data: { status: paymentStatus } });
    if (!preserveRiskReview && payment.order.status !== orderStatus) await tx.order.update({ where: { id: payment.orderId }, data: { status: orderStatus } });
    if (!existingEvent) await tx.orderEvent.create({ data: { orderId: payment.orderId, status: orderStatus, label, actor: "stripe" } });
  });
}
