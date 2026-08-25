import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { localizeDish, searchDishLibrary } from "@/lib/dish-library";

export const dynamic = "force-dynamic";

const ProductInput = z.object({
  name: z.string().trim().min(2).max(120),
  traditionalName: z.string().trim().min(2).max(120),
  sku: z.string().trim().min(3).max(40).regex(/^[a-zA-Z0-9_-]+$/),
  categoryId: z.string().trim().min(1),
  country: z.string().trim().min(2).max(80),
  packaging: z.string().trim().min(2).max(80),
  description: z.string().trim().min(10).max(1200),
  costPrice: z.coerce.number().positive().max(10000),
  profitMargin: z.coerce.number().min(0).max(10000),
  promoPrice: z.union([z.coerce.number().positive().max(10000), z.literal(""), z.null()]).optional(),
  stockQty: z.coerce.number().int().min(0).max(100000),
  netWeightGrams: z.coerce.number().int().min(0).max(100000),
  thermalClass: z.enum(["AMBIANT", "REFRIGERATED", "FROZEN"]),
  storageType: z.enum(["SEC", "FRAIS", "REFRIGERE", "SURGELE", "FUME", "SECHE", "CONSERVE"]),
  aliases: z.array(z.string().trim().min(2).max(80)).max(12).default([]),
  imageUrl: z.string().url().max(1000),
  isNew: z.boolean().default(false),
  isRecommended: z.boolean().default(false),
  isBestseller: z.boolean().default(false),
});

const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export async function GET(request: NextRequest) {
  const authorization = await authorizeAdminRequest(request, { module: "catalog", action: "read" });
  if (!authorization.ok) return authorization.response;

  const locale = new URL(request.url).searchParams.get("locale") === "en" ? "en" : "fr";
  const products = await db.product.findMany({
    orderBy: { updatedAt: "desc" },
    include: { translations: true, batches: true },
  });

  return NextResponse.json({
    total: products.length,
    products: products.map((product) => {
      const batchWeight = product.batches.reduce((sum, batch) => sum + Math.max(0, batch.quantity + batch.reserved), 0);
      const estimatedCost = batchWeight > 0
        ? product.batches.reduce((sum, batch) => sum + Number(batch.costPrice) * Math.max(0, batch.quantity + batch.reserved), 0) / batchWeight
        : null;
      const costPrice = product.costPrice === null ? estimatedCost : Number(product.costPrice);
      return {
        id: product.id,
        name: product.translations.find((translation) => translation.locale === locale)?.name || product.traditionalName,
        traditionalName: product.traditionalName,
        sku: product.sku,
        country: product.country,
        costPrice,
        profitMargin: product.profitMargin === null && costPrice !== null ? roundMoney(Number(product.price) - costPrice) : product.profitMargin === null ? null : Number(product.profitMargin),
        costSource: product.costPrice === null ? "estimated" : "recorded",
        price: Number(product.price),
        promoPrice: product.promoPrice === null ? null : Number(product.promoPrice),
        stockQty: product.stockQty,
        alertThreshold: product.alertThreshold,
        imageColor: product.imageColor,
        imageEmoji: product.imageEmoji,
        imageUrl: product.imageUrl,
        galleryUrls: (() => { try { return product.galleryUrls ? JSON.parse(product.galleryUrls) : []; } catch { return []; } })(),
        isNew: product.isNew,
        isRecommended: product.isRecommended,
        isBestseller: product.isBestseller,
        thermalClass: product.thermalClass,
        status: product.status,
      };
    }),
  });
}

export async function POST(request: NextRequest) {
  const authorization = await authorizeAdminRequest(request, { module: "catalog", action: "create" });
  if (!authorization.ok) return authorization.response;

  const parsed = ProductInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "La fiche produit est incomplète ou contient des valeurs invalides.", details: parsed.error.flatten() }, { status: 400 });
  }
  const input = parsed.data;
  const [category, duplicate] = await Promise.all([
    db.category.findUnique({ where: { id: input.categoryId } }),
    db.product.findUnique({ where: { sku: input.sku.toUpperCase() } }),
  ]);
  if (!category) return NextResponse.json({ error: "Catégorie introuvable." }, { status: 400 });
  if (duplicate) return NextResponse.json({ error: "Ce SKU existe déjà." }, { status: 409 });
  const price = roundMoney(input.costPrice + input.profitMargin);
  if (price <= 0 || price > 10000) {
    return NextResponse.json({ error: "Le prix de vente calculé doit être compris entre 0,01 € et 10 000 €." }, { status: 400 });
  }
  if (typeof input.promoPrice === "number" && input.promoPrice >= price) {
    return NextResponse.json({ error: "Le prix promotionnel doit être inférieur au prix normal." }, { status: 400 });
  }

  const aliases = Array.from(new Set(input.aliases.map((alias) => alias.trim()).filter(Boolean)));
  const product = await db.product.create({
    data: {
      sku: input.sku.toUpperCase(),
      traditionalName: input.traditionalName,
      categoryId: input.categoryId,
      country: input.country,
      packaging: input.packaging,
      costPrice: input.costPrice,
      profitMargin: input.profitMargin,
      price,
      promoPrice: typeof input.promoPrice === "number" ? input.promoPrice : null,
      pricePerKg: input.netWeightGrams > 0 ? price / (input.netWeightGrams / 1000) : null,
      stockQty: input.stockQty,
      netWeightGrams: input.netWeightGrams,
      thermalClass: input.thermalClass,
      storageType: input.storageType,
      imageUrl: input.imageUrl,
      isNew: input.isNew,
      isRecommended: input.isRecommended,
      isBestseller: input.isBestseller,
      isOnSale: typeof input.promoPrice === "number",
      status: "published",
      translations: {
        create: [
          { locale: "fr", name: input.name, description: input.description, validated: true },
          { locale: "en", name: input.name, description: input.description, validated: false },
        ],
      },
      aliases: { create: aliases.map((alias) => ({ alias, locale: "fr" })) },
    },
    include: { translations: true, category: true },
  });

  await db.auditLog.create({
    data: {
      action: "product_create",
      entityType: "Product",
      entityId: product.id,
      after: JSON.stringify({ sku: product.sku, name: input.name, costPrice: input.costPrice, profitMargin: input.profitMargin, price, stockQty: input.stockQty, imageUrl: input.imageUrl, isNew: input.isNew, isRecommended: input.isRecommended, isBestseller: input.isBestseller }),
      reason: `Création depuis la console par ${authorization.user.email}`,
    },
  });

  const recommendationText = `${input.name} ${input.traditionalName} ${input.description} ${input.country} ${category.nameFr} ${aliases.join(" ")}`;
  const recommendations = searchDishLibrary({ product: recommendationText, limit: 6 })
    .map(({ dish, score }) => localizeDish(dish, "fr", score));

  return NextResponse.json({
    product: { id: product.id, sku: product.sku, name: input.name, price },
    recommendations,
  }, { status: 201 });
}
