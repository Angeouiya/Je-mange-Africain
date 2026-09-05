import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { isFullRefund, providerRefundStatus, refundAmounts } from "@/lib/admin-refunds";
import { sendPushToUser } from "@/lib/push-server";

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
    const refunds = event.data.object.refunds?.data || [];
    if (refunds.length) {
      for (const refund of refunds) await updateRefund(refund);
    } else if (paymentIntentId && event.data.object.refunded) {
      await updatePayment(paymentIntentId, "refunded", "refunded", "Paiement remboursé");
    }
  }
  if (event.type === "refund.updated" || event.type === "refund.failed" || event.type === "charge.refund.updated") {
    await updateRefund(event.data.object);
  }

  return NextResponse.json({ received: true });
}

async function updateRefund(providerRefund: Stripe.Refund) {
  const paymentIntent = providerRefund.payment_intent;
  const paymentIntentId = typeof paymentIntent === "string" ? paymentIntent : paymentIntent?.id;
  if (!paymentIntentId) return;
  const payment = await db.payment.findFirst({
    where: { reference: paymentIntentId },
    include: { order: { include: { refunds: true, customer: { select: { userId: true } } } } },
  });
  if (!payment) return;

  const metadata = providerRefund.metadata || {};
  const requestId = metadata.request_id || providerRefund.id;
  const existing = payment.order.refunds.find((refund) => refund.id === requestId);
  const nextStatus = providerRefundStatus(providerRefund.status);
  const amount = providerRefund.amount / 100;
  const internalReason = [metadata.internal_reason || "Remboursement prestataire", metadata.internal_note].filter(Boolean).join(" · ");
  const projectedRefunds = payment.order.refunds
    .filter((refund) => refund.id !== requestId)
    .map((refund) => ({ amount: Number(refund.amount), status: refund.status }));
  projectedRefunds.push({ amount, status: nextStatus });
  const amounts = refundAmounts(Number(payment.amount), projectedRefunds);
  const fullRefund = nextStatus === "completed" && isFullRefund(Number(payment.amount), amounts.completed);
  const stateChanged = !existing || existing.status !== nextStatus || Number(existing.amount) !== amount;
  if (!stateChanged) return;

  await db.$transaction(async (transaction) => {
    await transaction.refund.upsert({
      where: { id: requestId },
      create: { id: requestId, orderId: payment.orderId, amount, reason: internalReason, status: nextStatus },
      update: { amount, reason: internalReason, status: nextStatus },
    });
    if (fullRefund) {
      if (payment.status !== "refunded") await transaction.payment.update({ where: { id: payment.id }, data: { status: "refunded" } });
      if (payment.order.status !== "refunded") await transaction.order.update({ where: { id: payment.orderId }, data: { status: "refunded" } });
    }
    const eventStatus = fullRefund ? "refunded" : nextStatus === "completed" ? "refund_completed" : nextStatus === "rejected" ? "refund_rejected" : "refund_pending";
    await transaction.orderEvent.create({
      data: {
        orderId: payment.orderId,
        status: eventStatus,
        label: fullRefund ? "Paiement remboursé intégralement" : nextStatus === "completed" ? "Remboursement partiel confirmé" : nextStatus === "rejected" ? "Remboursement rejeté" : "Remboursement en traitement",
        actor: "stripe",
      },
    });
    await transaction.auditLog.create({
      data: {
        action: "payment_refund_provider_update",
        entityType: "Payment",
        entityId: payment.id,
        before: JSON.stringify({ refundStatus: existing?.status || null, paymentStatus: payment.status }),
        after: JSON.stringify({ requestId, providerRefundId: providerRefund.id, amount, status: nextStatus, fullRefund }),
        reason: "Synchronisation du remboursement par Stripe",
      },
    });
  });

  if (nextStatus === "completed" && existing?.status !== "completed" && payment.order.customer?.userId) {
    await notifyRefund(payment.order.customer.userId, payment.orderId, amount, fullRefund).catch(() => undefined);
  }
}

async function notifyRefund(userId: string, orderId: string, amount: number, fullRefund: boolean) {
  const amountFr = amount.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
  const amountEn = amount.toLocaleString("en-GB", { style: "currency", currency: "EUR" });
  const titleFr = fullRefund ? "Paiement remboursé" : "Remboursement confirmé";
  const titleEn = fullRefund ? "Payment refunded" : "Refund confirmed";
  const bodyFr = `${amountFr} ont été recrédités sur votre moyen de paiement.`;
  const bodyEn = `${amountEn} has been returned to your payment method.`;
  const url = `/?view=order-tracking&orderId=${orderId}`;
  const notification = await db.notification.create({ data: { userId, channel: "push", type: "order", titleFr, titleEn, bodyFr, bodyEn, url } });
  const delivery = await sendPushToUser(userId, {
    fr: { title: titleFr, body: bodyFr, url, type: "order", tag: `refund-${orderId}` },
    en: { title: titleEn, body: bodyEn, url, type: "order", tag: `refund-${orderId}` },
  });
  if (delivery.sent > 0) await db.notification.update({ where: { id: notification.id }, data: { sent: true, deliveredCount: delivery.sent, failedCount: delivery.failed } });
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
