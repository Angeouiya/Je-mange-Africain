import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authorizeCustomerRequest } from "@/lib/customer-auth";
import { CheckoutPricingError, priceCheckout } from "@/lib/checkout-pricing";
import { assessCheckoutRisk } from "@/lib/fraud";
import { enforceRateLimit, redis } from "@/lib/redis";
import { stripe, stripeConfigurationError } from "@/lib/stripe";

export const dynamic = "force-dynamic";

const IntentRequest = z.object({
  items: z.array(z.object({
    productId: z.string().min(1),
    qty: z.number().int().min(1).max(99),
    recipeId: z.string().optional(),
    recipeNameFr: z.string().max(160).optional(),
    recipeNameEn: z.string().max(160).optional(),
  })).min(1).max(80),
  address: z.object({
    firstName: z.string().trim().min(1).max(80),
    lastName: z.string().trim().max(80).default(""),
    street: z.string().trim().min(3).max(180),
    postalCode: z.string().trim().min(2).max(20),
    city: z.string().trim().min(2).max(100),
    country: z.string().trim().min(2).max(80),
    phone: z.string().trim().max(30).optional(),
  }),
  coupon: z.string().trim().max(50).nullable().optional(),
  locale: z.enum(["fr", "en"]).default("fr"),
});

export async function POST(request: NextRequest) {
  const limited = await enforceRateLimit(request, "checkout");
  if (limited) return limited;

  const customer = await authorizeCustomerRequest(request);
  if (!customer) return NextResponse.json({ error: "Authentification client requise." }, { status: 401 });

  const parsed = IntentRequest.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Le panier ou l'adresse est invalide." }, { status: 400 });
  if (!stripe) return NextResponse.json({ error: stripeConfigurationError(parsed.data.locale) }, { status: 503 });

  try {
    const pricing = await priceCheckout({
      items: parsed.data.items,
      country: parsed.data.address.country,
      coupon: parsed.data.coupon,
    });
    const itemCount = pricing.validatedItems.reduce((sum, item) => sum + item.qty, 0);
    const recentAttempts = await paymentVelocity(customer.id);
    const risk = assessCheckoutRisk({
      total: pricing.total,
      itemCount,
      uniqueProducts: pricing.validatedItems.length,
      email: customer.email,
      phone: parsed.data.address.phone || customer.phone,
      postalCode: parsed.data.address.postalCode,
      recentAttempts,
    });

    const addressFingerprint = createHash("sha256").update(JSON.stringify(parsed.data.address)).digest("hex").slice(0, 16);
    const intent = await stripe.paymentIntents.create({
      amount: Math.round(pricing.total * 100),
      currency: "eur",
      payment_method_types: ["card"],
      receipt_email: customer.email,
      description: "Commande Je mange Africain",
      metadata: {
        customer_auth_id: customer.id,
        cart_fingerprint: pricing.fingerprint,
        risk_score: String(risk.score),
        risk_level: risk.level,
      },
      shipping: {
        name: `${parsed.data.address.firstName} ${parsed.data.address.lastName}`.trim(),
        phone: parsed.data.address.phone || customer.phone || undefined,
        address: {
          line1: parsed.data.address.street,
          postal_code: parsed.data.address.postalCode,
          city: parsed.data.address.city,
          country: countryCode(parsed.data.address.country),
        },
      },
    }, { idempotencyKey: `jma:${customer.id}:${pricing.fingerprint}:${addressFingerprint}` });

    return NextResponse.json({
      paymentIntentId: intent.id,
      clientSecret: intent.client_secret,
      amount: pricing.total,
      currency: "EUR",
      riskLevel: risk.level,
      pricing: {
        subtotal: pricing.subtotal,
        promoDiscount: pricing.promoDiscount,
        shipping: pricing.shipping,
        vat: pricing.vat,
        packages: pricing.thermalClasses.length || 1,
        carrier: pricing.shippingQuote.carrier,
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

function countryCode(country: string) {
  const normalized = country.trim().toLowerCase();
  if (normalized === "france" || normalized === "fr") return "FR";
  if (normalized === "belgique" || normalized === "belgium" || normalized === "be") return "BE";
  if (normalized === "allemagne" || normalized === "germany" || normalized === "de") return "DE";
  if (normalized === "pays-bas" || normalized === "netherlands" || normalized === "nl") return "NL";
  if (normalized === "luxembourg" || normalized === "lu") return "LU";
  return "FR";
}
