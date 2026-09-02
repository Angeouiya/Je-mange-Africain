import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { localizeDish, searchDishLibrary } from "@/lib/dish-library";
import { productAdminInput, roundMoney, wholesaleProductData } from "@/lib/admin-product-schema";
import { getProductPhoto } from "@/lib/market-media";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authorization = await authorizeAdminRequest(request, { module: "catalog", action: "read" });
  if (!authorization.ok) return authorization.response;

  const locale = new URL(request.url).searchParams.get("locale") === "en" ? "en" : "fr";
  const products = await db.product.findMany({
    orderBy: { updatedAt: "desc" },
    include: { translations: true, batches: true, aliases: true, category: true },
  });

  return NextResponse.json({
    total: products.length,
    products: products.map((product) => {
      const batchWeight = product.batches.reduce((sum, batch) => sum + Math.max(0, batch.quantity + batch.reserved), 0);
      const estimatedCost = batchWeight > 0
        ? product.batches.reduce((sum, batch) => sum + Number(batch.costPrice) * Math.max(0, batch.quantity + batch.reserved), 0) / batchWeight
        : null;
      const costPrice = product.costPrice === null ? estimatedCost : Number(product.costPrice);
      const french = product.translations.find((translation) => translation.locale === "fr");
      const english = product.translations.find((translation) => translation.locale === "en");
      return {
        id: product.id,
        name: product.translations.find((translation) => translation.locale === locale)?.name || french?.name || product.traditionalName,
        nameFr: french?.name || product.traditionalName,
        nameEn: english?.name || french?.name || product.traditionalName,
        descriptionFr: french?.description || "",
        descriptionEn: english?.description || french?.description || "",
        traditionalName: product.traditionalName,
        sku: product.sku,
        categoryId: product.categoryId,
        country: product.country,
        packaging: product.packaging,
        costPrice,
        profitMargin: product.profitMargin === null && costPrice !== null ? roundMoney(Number(product.price) - costPrice) : product.profitMargin === null ? null : Number(product.profitMargin),
        costSource: product.costPrice === null ? "estimated" : "recorded",
        price: Number(product.price),
        promoPrice: product.promoPrice === null ? null : Number(product.promoPrice),
        isWholesale: product.isWholesale,
        wholesalePackLabel: product.wholesalePackLabel,
        wholesaleUnitsPerPack: product.wholesaleUnitsPerPack,
        wholesaleMinPacks: product.wholesaleMinPacks,
        wholesalePrice: product.wholesalePrice === null ? null : Number(product.wholesalePrice),
        wholesaleTier2MinPacks: product.wholesaleTier2MinPacks,
        wholesaleTier2Price: product.wholesaleTier2Price === null ? null : Number(product.wholesaleTier2Price),
        wholesaleTier3MinPacks: product.wholesaleTier3MinPacks,
        wholesaleTier3Price: product.wholesaleTier3Price === null ? null : Number(product.wholesaleTier3Price),
        stockQty: product.stockQty,
        alertThreshold: product.alertThreshold,
        netWeightGrams: product.netWeightGrams,
        imageColor: product.imageColor,
        imageEmoji: product.imageEmoji,
        imageUrl: getProductPhoto({
          traditionalName: product.traditionalName,
          name: locale === "en" ? english?.name : french?.name,
          imageUrl: product.imageUrl,
          imageEmoji: product.imageEmoji,
          category: { slug: product.category.slug, name: product.category.nameFr },
        }),
        galleryUrls: (() => { try { return product.galleryUrls ? JSON.parse(product.galleryUrls) : []; } catch { return []; } })(),
        isNew: product.isNew,
        isRecommended: product.isRecommended,
        isBestseller: product.isBestseller,
        thermalClass: product.thermalClass,
        storageType: product.storageType,
        status: product.status,
        aliases: product.aliases.map((alias) => alias.alias),
      };
    }),
  });
}

export async function POST(request: NextRequest) {
  const authorization = await authorizeAdminRequest(request, { module: "catalog", action: "create" });
  if (!authorization.ok) return authorization.response;

  const parsed = productAdminInput.safeParse(await request.json().catch(() => null));
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
      ...wholesaleProductData(input),
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
      status: input.status,
      translations: {
        create: [
          { locale: "fr", name: input.nameFr, description: input.descriptionFr, validated: true },
          { locale: "en", name: input.nameEn, description: input.descriptionEn, validated: true },
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
      after: JSON.stringify({ sku: product.sku, nameFr: input.nameFr, nameEn: input.nameEn, costPrice: input.costPrice, profitMargin: input.profitMargin, price, stockQty: input.stockQty, imageUrl: input.imageUrl, status: input.status, isNew: input.isNew, isRecommended: input.isRecommended, isBestseller: input.isBestseller, wholesale: wholesaleProductData(input) }),
      reason: `Création depuis la console par ${authorization.user.email}`,
    },
  });

  const recommendationText = `${input.nameFr} ${input.nameEn} ${input.traditionalName} ${input.descriptionFr} ${input.descriptionEn} ${input.country} ${category.nameFr} ${aliases.join(" ")}`;
  const recommendations = searchDishLibrary({ product: recommendationText, limit: 6 })
    .map(({ dish, score }) => localizeDish(dish, "fr", score));

  return NextResponse.json({
    product: { id: product.id, sku: product.sku, name: input.nameFr, price },
    recommendations,
  }, { status: 201 });
}
