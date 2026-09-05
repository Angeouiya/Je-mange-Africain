import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { enforceRateLimit } from "@/lib/redis";
import { evaluatePromotion, type PromotionLine } from "@/lib/promotion-policy";

export const dynamic = "force-dynamic";

const PromotionValidationInput = z.object({
  code: z.string().trim().min(1).max(50),
  subtotal: z.coerce.number().finite().min(0).max(1_000_000),
  country: z.string().trim().max(80).optional(),
  locale: z.enum(["fr", "en"]).default("fr"),
  items: z.array(z.object({
    productId: z.string().trim().min(1).max(120),
    lineTotal: z.coerce.number().finite().min(0).max(1_000_000),
  })).max(80).default([]),
});

export async function POST(req: NextRequest) {
  const limited = await enforceRateLimit(req, "search");
  if (limited) return limited;
  const parsed = PromotionValidationInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ valid: false, error: "Code ou panier invalide." }, { status: 400 });
  const input = parsed.data;
  const promo = await db.promotion.findUnique({ where: { code: input.code.toUpperCase() } });
  if (!promo) return NextResponse.json({ valid: false, error: input.locale === "fr" ? "Code promotionnel inconnu." : "Unknown promotion code." });

  let lines: PromotionLine[] = input.items.map((item) => ({ ...item, categoryId: null }));
  if (promo.appliesTo === "category" && input.items.length) {
    const products = await db.product.findMany({ where: { id: { in: [...new Set(input.items.map((item) => item.productId))] } }, select: { id: true, categoryId: true } });
    const categories = new Map(products.map((product) => [product.id, product.categoryId]));
    lines = input.items.map((item) => ({ ...item, categoryId: categories.get(item.productId) || null }));
  }
  const result = evaluatePromotion(promo, { subtotal: input.subtotal, country: input.country, lines, locale: input.locale });
  if (!result.valid) return NextResponse.json(result);

  return NextResponse.json({
    valid: true,
    code: promo.code,
    type: promo.type,
    value: Number(promo.value),
    discount: result.discount,
    freeShipping: result.freeShipping,
    eligibleSubtotal: result.eligibleSubtotal,
    lifecycle: result.lifecycle,
  });
}
