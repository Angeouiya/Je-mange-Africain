import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { CheckoutPricingError, priceCheckout } from "@/lib/checkout-pricing";
import { authorizeCustomerRequest } from "@/lib/customer-auth";
import { db } from "@/lib/db";
import { sendPushToSubscriptionId } from "@/lib/push-server";
import { enforceRateLimit } from "@/lib/redis";
import { stripe, stripeConfigurationError } from "@/lib/stripe";
import { deliveryContactFingerprint } from "@/lib/checkout-security";
import { paymentMethodUsed } from "@/lib/stripe-payment-method";

export const dynamic = "force-dynamic";

const CheckoutRequest = z.object({
  items: z.array(z.object({
    productId: z.string().min(1),
    variantId: z.string().trim().min(1).max(100).optional(),
    qty: z.number().int().min(1).max(99),
    recipeId: z.string().optional(),
    recipeNameFr: z.string().max(160).optional(),
    recipeNameEn: z.string().max(160).optional(),
    salesChannel: z.enum(["retail", "wholesale"]).optional(),
  })).min(1).max(80),
  address: z.object({
    firstName: z.string().trim().min(1).max(80),
    lastName: z.string().trim().min(1).max(80),
    email: z.string().trim().email().max(180),
    street: z.string().trim().min(3).max(180),
    postalCode: z.string().trim().min(2).max(20),
    city: z.string().trim().min(2).max(100),
    country: z.string().trim().min(2).max(80),
    phone: z.string().trim().min(6).max(30),
  }),
  deliverySlot: z.enum(["standard", "express", "relay"]).default("standard"),
  paymentIntentId: z.string().startsWith("pi_"),
  coupon: z.string().trim().max(50).nullable().optional(),
  locale: z.enum(["fr", "en"]).default("fr"),
  pushSubscriptionId: z.string().max(300).optional(),
});

export async function POST(request: NextRequest) {
  const limited = await enforceRateLimit(request, "checkout");
  if (limited) return limited;

  const session = await authorizeCustomerRequest(request);
  if (!session) return NextResponse.json({ error: "Authentification client requise." }, { status: 401 });

  const parsed = CheckoutRequest.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "La commande transmise est invalide." }, { status: 400 });
  const body = parsed.data;
  if (!stripe) return NextResponse.json({ error: stripeConfigurationError(body.locale) }, { status: 503 });

  try {
    const pricing = await priceCheckout({ items: body.items, country: body.address.country, postalCode: body.address.postalCode, deliveryService: body.deliverySlot, coupon: body.coupon, locale: body.locale });
    const intent = await stripe.paymentIntents.retrieve(body.paymentIntentId, { expand: ["payment_method", "latest_charge"] });
    const expectedAmount = Math.round(pricing.total * 100);
    const addressFingerprint = deliveryContactFingerprint(body.address);

    if (intent.status !== "succeeded") {
      return NextResponse.json({ error: body.locale === "fr" ? "Le paiement n'est pas encore confirmé." : "Payment has not been confirmed yet." }, { status: 409 });
    }
    if (
      intent.amount_received !== expectedAmount
      || intent.currency.toLowerCase() !== "eur"
      || intent.metadata.customer_auth_id !== session.id
      || intent.metadata.cart_fingerprint !== pricing.fingerprint
      || intent.metadata.delivery_service !== pricing.shippingQuote.service
      || intent.metadata.address_fingerprint !== addressFingerprint
    ) {
      return NextResponse.json({ error: body.locale === "fr" ? "Le paiement ne correspond plus au panier actuel." : "The payment no longer matches the current basket." }, { status: 409 });
    }

    const idempotencyKey = `stripe:${intent.id}`;
    const existingPayment = await db.payment.findUnique({ where: { idempotencyKey }, include: { order: true } });
    if (existingPayment) return orderResponse(existingPayment.order);

    const user = await db.user.findUnique({ where: { email: session.email.toLowerCase() } });
    if (!user || user.role !== "customer" || !user.isActive) {
      return NextResponse.json({ error: "Compte client introuvable ou inactif." }, { status: 403 });
    }
    let customer = await db.customer.findUnique({ where: { userId: user.id } });
    if (!customer) customer = await db.customer.create({ data: { userId: user.id, preferredLang: body.locale } });

    const carrier = await db.carrier.findFirst({
      where: { name: pricing.shippingQuote.carrier },
    }) || await db.carrier.findFirst({ orderBy: { rating: "desc" } });
    const number = `JMA-${new Date().getUTCFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`;
    const paymentMethod = paymentMethodUsed(intent);
    const fraudScore = Math.max(0, Math.min(100, Number(intent.metadata.risk_score) || 0));
    const wholesalePackages = pricing.validatedItems.filter((item) => item.salesChannel === "wholesale").reduce((sum, item) => sum + item.qty, 0);
    const retailPackages = new Set(pricing.validatedItems.filter((item) => item.salesChannel === "retail").map((item) => item.thermalClass)).size;
    const packageCount = Math.max(1, wholesalePackages + retailPackages);

    const order = await db.$transaction(async (tx) => {
      const duplicate = await tx.payment.findUnique({ where: { idempotencyKey }, include: { order: true } });
      if (duplicate) return duplicate.order;

      const reservationTotals = new Map<string, number>();
      for (const item of pricing.validatedItems) reservationTotals.set(item.productId, (reservationTotals.get(item.productId) || 0) + item.qty * item.unitsPerPack);
      for (const [productId, requiredUnits] of reservationTotals) {
        const product = await tx.product.findUnique({ where: { id: productId } });
        if (!product || product.stockQty - product.reservedQty < requiredUnits) {
          throw new CheckoutPricingError(body.locale === "fr" ? "Le stock disponible a changé. Vérifiez votre panier." : "Available stock has changed. Please review your basket.", 409);
        }
      }

      const order = await tx.order.create({
        data: {
          number,
          customerId: customer.id,
          status: fraudScore >= 60 ? "fraudCheck" : "paymentConfirmed",
          subtotal: pricing.subtotal,
          promoDiscount: pricing.promoDiscount,
          vatAmount: pricing.vat,
          shippingCost: pricing.shipping,
          total: pricing.total,
          currency: "EUR",
          weightGrams: pricing.weightGrams,
          packageCount,
          deliveryName: `${body.address.firstName} ${body.address.lastName}`.trim(),
          deliveryEmail: body.address.email,
          deliveryPhone: body.address.phone,
          deliveryAddress: body.address.street,
          deliveryCity: body.address.city,
          deliveryPostalCode: body.address.postalCode,
          deliveryCountry: body.address.country,
          deliverySlot: body.deliverySlot,
          carrierId: carrier?.id || null,
          paymentMethod,
          fraudScore,
          items: { create: pricing.validatedItems },
          timeline: {
            create: [
              { status: "paymentConfirmed", label: body.locale === "fr" ? "Paiement confirmé" : "Payment confirmed" },
              { status: "stockReserved", label: body.locale === "fr" ? "Stock réservé" : "Stock reserved" },
              ...(fraudScore >= 60 ? [{ status: "fraudCheck", label: body.locale === "fr" ? "Vérification de sécurité" : "Security review" }] : []),
            ],
          },
        },
      });

      for (const item of pricing.validatedItems) {
        const stockUnits = item.qty * item.unitsPerPack;
        await tx.product.update({ where: { id: item.productId }, data: { reservedQty: { increment: stockUnits } } });

        let remaining = stockUnits;
        const batches = await tx.inventoryBatch.findMany({
          where: { productId: item.productId, status: "active", quantity: { gt: 0 } },
          orderBy: { expiryDate: "asc" },
        });
        for (const batch of batches) {
          if (remaining <= 0) break;
          const available = Math.max(0, batch.quantity - batch.reserved);
          const take = Math.min(remaining, available);
          if (!take) continue;
          await tx.inventoryBatch.update({ where: { id: batch.id }, data: { reserved: { increment: take } } });
          await tx.stockMovement.create({
            data: {
              batchId: batch.id,
              productId: item.productId,
              warehouseId: batch.warehouseId,
              type: "reservation",
              quantity: -take,
              reason: `Commande ${number}`,
              beforeQty: available,
              afterQty: available - take,
            },
          });
          await tx.orderBatchAllocation.create({
            data: { orderId: order.id, productId: item.productId, batchId: batch.id, quantity: take, unitCost: batch.costPrice },
          });
          remaining -= take;
        }
      }

      await tx.payment.create({
        data: {
          orderId: order.id,
          amount: pricing.total,
          method: paymentMethod,
          status: "captured",
          reference: intent.id,
          idempotencyKey,
        },
      });

      if (pricing.promotionId) {
        await tx.promotion.update({ where: { id: pricing.promotionId }, data: { usedCount: { increment: 1 } } });
      }

      for (let index = 0; index < pricing.thermalClasses.length; index += 1) {
        const thermalClass = pricing.thermalClasses[index];
        const etaHours = body.deliverySlot === "express" ? 24 : body.deliverySlot === "relay" ? 72 : 48;
        await tx.shipment.create({
          data: {
            orderId: order.id,
            carrierId: carrier?.id || null,
            trackingNumber: `${(carrier?.name || "JMA").slice(0, 3).toUpperCase()}-${number.slice(-8)}-${thermalClass[0]}`,
            thermalClass,
            status: "created",
            estimatedDelivery: new Date(Date.now() + etaHours * 3_600_000),
            confirmCode: String(Math.floor(1000 + Math.random() * 9000)),
          },
        });
      }

      await tx.auditLog.create({
        data: {
          action: "order_created",
          entityType: "order",
          entityId: order.id,
          before: "{}",
          after: JSON.stringify({ number, total: pricing.total, paymentIntentId: intent.id, fraudScore }),
          reason: `Nouvelle commande ${number}`,
        },
      });
      return order;
    }, { isolationLevel: "Serializable", maxWait: 5_000, timeout: 15_000 });

    if (body.pushSubscriptionId) {
      await sendPushToSubscriptionId(body.pushSubscriptionId, {
        title: body.locale === "en" ? "Order confirmed" : "Commande confirmée",
        body: body.locale === "en" ? `${number} is being prepared. We will keep you updated.` : `${number} est en préparation. Nous vous tiendrons informé ici.`,
        url: "/?view=orders",
        type: "order",
        tag: `order-${order.id}`,
      });
    }

    return orderResponse(order);
  } catch (error) {
    if (error instanceof CheckoutPricingError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: body.locale === "fr" ? "La commande n'a pas pu être finalisée. Aucun nouveau débit n'a été effectué." : "The order could not be completed. No new charge was made." }, { status: 503 });
  }
}

function orderResponse(order: { id: string; number: string; total: unknown; status: string }) {
  return NextResponse.json({ order: { id: order.id, number: order.number, total: Number(order.total), status: order.status } });
}
