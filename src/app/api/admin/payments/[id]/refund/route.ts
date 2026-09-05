import { NextRequest, NextResponse } from "next/server";
import { AdminRefundInput, isFullRefund, providerRefundStatus, refundAmounts, refundReasonLabel } from "@/lib/admin-refunds";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { sendPushToUser } from "@/lib/push-server";
import { stripe, stripeConfigurationError } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await authorizeAdminRequest(request, { module: "finance", action: "update" });
  if (!authorization.ok) return authorization.response;

  const parsed = AdminRefundInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Le remboursement est incomplet ou invalide.", details: parsed.error.flatten() }, { status: 400 });
  }
  const input = parsed.data;
  if (!stripe) return NextResponse.json({ error: stripeConfigurationError(input.locale) }, { status: 503 });

  const { id } = await params;
  const payment = await db.payment.findUnique({
    where: { id },
    include: {
      order: {
        include: {
          refunds: true,
          customer: { select: { userId: true } },
        },
      },
    },
  });
  if (!payment) return NextResponse.json({ error: input.locale === "fr" ? "Paiement introuvable." : "Payment not found." }, { status: 404 });
  if (!payment.reference) return NextResponse.json({ error: input.locale === "fr" ? "La référence du prestataire est absente." : "The provider reference is missing." }, { status: 409 });

  const previousRequest = payment.order.refunds.find((refund) => refund.id === input.requestId);
  if (previousRequest && Number(previousRequest.amount) !== input.amount) {
    return NextResponse.json({ error: input.locale === "fr" ? "Cette demande existe déjà avec un autre montant." : "This request already exists with a different amount." }, { status: 409 });
  }
  if (previousRequest && previousRequest.status !== "pending") {
    return NextResponse.json({
      ...refundResponse(payment, previousRequest),
      ...(previousRequest.status === "rejected" ? { error: input.locale === "fr" ? "Le remboursement a été rejeté par le prestataire." : "The refund was rejected by the provider." } : {}),
    }, { status: previousRequest.status === "rejected" ? 409 : 200 });
  }
  if (!previousRequest && payment.status !== "captured") {
    return NextResponse.json({ error: input.locale === "fr" ? "Seul un paiement capturé peut être remboursé." : "Only a captured payment can be refunded." }, { status: 409 });
  }

  const currentAmounts = refundAmounts(Number(payment.amount), payment.order.refunds.map((refund) => ({ amount: Number(refund.amount), status: refund.status })));
  if (!previousRequest && Math.round(input.amount * 100) > Math.round(currentAmounts.refundable * 100)) {
    return NextResponse.json({
      error: input.locale === "fr"
        ? `Le montant dépasse le solde remboursable de ${currentAmounts.refundable.toFixed(2)} €.`
        : `The amount exceeds the refundable balance of €${currentAmounts.refundable.toFixed(2)}.`,
      refundableAmount: currentAmounts.refundable,
    }, { status: 409 });
  }

  const internalReason = `${refundReasonLabel(input.reason, "fr")} · ${input.note}`;
  if (!previousRequest) {
    try {
      await db.refund.create({
        data: { id: input.requestId, orderId: payment.orderId, amount: input.amount, reason: internalReason, status: "pending" },
      });
    } catch {
      const concurrentRequest = await db.refund.findUnique({ where: { id: input.requestId } });
      if (!concurrentRequest || concurrentRequest.orderId !== payment.orderId || Number(concurrentRequest.amount) !== input.amount) {
        return NextResponse.json({ error: input.locale === "fr" ? "Cette demande ne peut pas être rapprochée." : "This request cannot be reconciled." }, { status: 409 });
      }
    }
  }

  let providerRefund;
  try {
    providerRefund = await stripe.refunds.create({
      payment_intent: payment.reference,
      amount: Math.round(input.amount * 100),
      reason: "requested_by_customer",
      metadata: {
        order_id: payment.orderId,
        payment_id: payment.id,
        request_id: input.requestId,
        internal_reason: input.reason,
        internal_note: input.note,
        requested_by: authorization.user.email,
      },
    }, { idempotencyKey: `jma-admin-refund:${input.requestId}` });
  } catch {
    return NextResponse.json({
      error: input.locale === "fr"
        ? "Le prestataire n'a pas encore confirmé le remboursement. La demande est conservée et peut être relancée sans double débit."
        : "The provider has not confirmed the refund yet. The request is preserved and can be retried without a duplicate charge.",
      retryable: true,
      requestId: input.requestId,
    }, { status: 503 });
  }

  const nextStatus = providerRefundStatus(providerRefund.status);
  const projectedRefunds = payment.order.refunds
    .filter((refund) => refund.id !== input.requestId)
    .map((refund) => ({ amount: Number(refund.amount), status: refund.status }));
  projectedRefunds.push({ amount: input.amount, status: nextStatus });
  const nextAmounts = refundAmounts(Number(payment.amount), projectedRefunds);
  const fullRefund = nextStatus === "completed" && isFullRefund(Number(payment.amount), nextAmounts.completed);
  const stateChanged = !previousRequest || previousRequest.status !== nextStatus;
  const eventStatus = fullRefund ? "refunded" : nextStatus === "completed" ? "refund_completed" : nextStatus === "rejected" ? "refund_rejected" : "refund_pending";
  const eventLabel = fullRefund
    ? (input.locale === "fr" ? "Paiement remboursé intégralement" : "Payment refunded in full")
    : nextStatus === "completed"
      ? (input.locale === "fr" ? `Remboursement partiel de ${input.amount.toFixed(2)} €` : `Partial refund of €${input.amount.toFixed(2)}`)
      : nextStatus === "rejected"
        ? (input.locale === "fr" ? "Remboursement rejeté par le prestataire" : "Refund rejected by provider")
        : (input.locale === "fr" ? "Remboursement transmis au prestataire" : "Refund sent to provider");

  await db.$transaction(async (transaction) => {
    await transaction.refund.update({
      where: { id: input.requestId },
      data: { status: nextStatus, reason: internalReason, amount: input.amount },
    });
    if (fullRefund && payment.status !== "refunded") {
      await transaction.payment.update({ where: { id: payment.id }, data: { status: "refunded" } });
      await transaction.order.update({ where: { id: payment.orderId }, data: { status: "refunded" } });
    }
    if (stateChanged) {
      await transaction.orderEvent.create({
        data: { orderId: payment.orderId, status: eventStatus, label: eventLabel, actor: authorization.user.email },
      });
      await transaction.auditLog.create({
        data: {
          action: fullRefund ? "payment_refund_full" : "payment_refund_update",
          entityType: "Payment",
          entityId: payment.id,
          before: JSON.stringify({ paymentStatus: payment.status, refundableAmount: currentAmounts.refundable, refundStatus: previousRequest?.status || null }),
          after: JSON.stringify({ requestId: input.requestId, providerRefundId: providerRefund.id, amount: input.amount, reason: input.reason, status: nextStatus, fullRefund }),
          reason: `${refundReasonLabel(input.reason, "fr")} par ${authorization.user.email} · ${input.note}`,
          ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
        },
      });
    }
  });

  if (stateChanged && nextStatus === "completed" && payment.order.customer?.userId) {
    await notifyCustomer(payment.order.customer.userId, payment.orderId, input.amount, fullRefund).catch(() => undefined);
  }

  return NextResponse.json({
    refund: { id: input.requestId, providerReference: providerRefund.id, amount: input.amount, status: nextStatus, reason: internalReason },
    payment: { id: payment.id, status: fullRefund ? "refunded" : payment.status, ...nextAmounts },
    order: { id: payment.orderId, status: fullRefund ? "refunded" : payment.order.status },
    ...(nextStatus === "rejected" ? { error: input.locale === "fr" ? "Le remboursement a été rejeté par le prestataire." : "The refund was rejected by the provider." } : {}),
  }, { status: nextStatus === "pending" ? 202 : nextStatus === "rejected" ? 409 : 200 });
}

function refundResponse(payment: { id: string; amount: unknown; status: string; orderId: string; order: { status: string; refunds: Array<{ id: string; amount: unknown; status: string; reason: string }> } }, refund: { id: string; amount: unknown; status: string; reason: string }) {
  const amounts = refundAmounts(Number(payment.amount), payment.order.refunds.map((row) => ({ amount: Number(row.amount), status: row.status })));
  return {
    refund: { id: refund.id, amount: Number(refund.amount), status: refund.status, reason: refund.reason },
    payment: { id: payment.id, status: payment.status, ...amounts },
    order: { id: payment.orderId, status: payment.order.status },
  };
}

async function notifyCustomer(userId: string, orderId: string, amount: number, fullRefund: boolean) {
  const amountFr = amount.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
  const amountEn = amount.toLocaleString("en-GB", { style: "currency", currency: "EUR" });
  const titleFr = fullRefund ? "Paiement remboursé" : "Remboursement confirmé";
  const titleEn = fullRefund ? "Payment refunded" : "Refund confirmed";
  const bodyFr = fullRefund ? `${amountFr} ont été remboursés sur votre moyen de paiement.` : `Un remboursement de ${amountFr} a été confirmé.`;
  const bodyEn = fullRefund ? `${amountEn} has been refunded to your payment method.` : `A refund of ${amountEn} has been confirmed.`;
  const url = `/?view=order-tracking&orderId=${orderId}`;
  const notification = await db.notification.create({ data: { userId, channel: "push", type: "order", titleFr, titleEn, bodyFr, bodyEn, url } });
  const delivery = await sendPushToUser(userId, {
    fr: { title: titleFr, body: bodyFr, url, type: "order", tag: `refund-${orderId}` },
    en: { title: titleEn, body: bodyEn, url, type: "order", tag: `refund-${orderId}` },
  });
  if (delivery.sent > 0) await db.notification.update({ where: { id: notification.id }, data: { sent: true, deliveredCount: delivery.sent, failedCount: delivery.failed } });
}
