import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authorizeCustomerRequest } from "@/lib/customer-auth";
import { CheckoutPricingError, priceCheckout } from "@/lib/checkout-pricing";
import { assessCheckoutRisk } from "@/lib/fraud";
import { enforceRateLimit, redis } from "@/lib/redis";
import { stripe, stripeConfigurationError } from "@/lib/stripe";
import { deliveryContactFingerprint } from "@/lib/checkout-security";
import { europeanCountryCode } from "@/lib/european-countries";

export const dynamic = "force-dynamic";

const IntentRequest = z.object({
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
  coupon: z.string().trim().max(50).nullable().optional(),
  locale: z.enum(["fr", "en"]).default("fr"),
  checkoutAttemptId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  const limited = await enforceRateLimit(request, "checkout");
  if (limited) return limited;

  const customer = await authorizeCustomerRequest(request);
  if (!customer) return NextResponse.json({ error: "Authentification client requise." }, { status: 401 });

  const parsed = IntentRequest.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Le panier ou l'adresse est invalide." }, { status: 400 });
  const shippingCountryCode = europeanCountryCode(parsed.data.address.country);
  if (!shippingCountryCode) {
    return NextResponse.json({ error: parsed.data.locale === "fr" ? "Ce pays n'est pas encore desservi." : "This country is not yet supported." }, { status: 400 });
  }
  if (!stripe) return NextResponse.json({ error: stripeConfigurationError(parsed.data.locale) }, { status: 503 });

  try {
    const pricing = await priceCheckout({
      items: parsed.data.items,
      country: parsed.data.address.country,
      postalCode: parsed.data.address.postalCode,
      deliveryService: parsed.data.deliverySlot,
      coupon: parsed.data.coupon,
      locale: parsed.data.locale,
    });
    const itemCount = pricing.validatedItems.reduce((sum, item) => sum + item.qty * item.unitsPerPack, 0);
    const recentAttempts = await paymentVelocity(customer.id);
    const risk = assessCheckoutRisk({
      total: pricing.total,
      itemCount,
      uniqueProducts: pricing.validatedItems.length,
      email: customer.email,
      phone: parsed.data.address.phone,
      postalCode: parsed.data.address.postalCode,
      recentAttempts,
    });

    const addressFingerprint = deliveryContactFingerprint(parsed.data.address);
    const intent = await stripe.paymentIntents.create({
      amount: Math.round(pricing.total * 100),
      currency: "eur",
      automatic_payment_methods: { enabled: true },
      receipt_email: parsed.data.address.email,
      description: "Commande Je mange Africain",
      metadata: {
        customer_auth_id: customer.id,
        cart_fingerprint: pricing.fingerprint,
        risk_score: String(risk.score),
        risk_level: risk.level,
        delivery_service: pricing.shippingQuote.service,
        address_fingerprint: addressFingerprint,
        checkout_attempt_id: parsed.data.checkoutAttemptId,
      },
      shipping: {
        name: `${parsed.data.address.firstName} ${parsed.data.address.lastName}`.trim(),
        phone: parsed.data.address.phone,
        address: {
          line1: parsed.data.address.street,
          postal_code: parsed.data.address.postalCode,
          city: parsed.data.address.city,
          country: shippingCountryCode,
        },
      },
    }, { idempotencyKey: `jma:${customer.id}:${parsed.data.checkoutAttemptId}` });

    return NextResponse.json({
      paymentIntentId: intent.id,
      clientSecret: intent.client_secret,
      amount: pricing.total,
      currency: "EUR",
      paymentMethodTypes: intent.payment_method_types,
      riskLevel: risk.level,
      pricing: {
        subtotal: pricing.subtotal,
        promoDiscount: pricing.promoDiscount,
        shipping: pricing.shipping,
        vat: pricing.vat,
        packages: pricing.thermalClasses.length || 1,
        carrier: pricing.shippingQuote.carrier,
        service: pricing.shippingQuote.service,
        minDelayHours: pricing.shippingQuote.minDelayHours,
        maxDelayHours: pricing.shippingQuote.maxDelayHours,
      },
    });
  } catch (error) {
    if (error instanceof CheckoutPricingError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Le paiement sécurisé est momentanément indisponible." }, { status: 503 });
  }
}

async function paymentVelocity(customerId: string) {
  if (!redis) return 0;
  try {
    const key = `jma:payment-attempts:${customerId}`;
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, 10 * 60);
    return count;
  } catch {
    return 0;
  }
}
