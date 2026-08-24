import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const locale = (searchParams.get("locale") as "fr" | "en") || "fr";

  const product = await db.product.findUnique({
    where: { id },
    include: {
      translations: true,
      brand: true,
      supplier: true,
      category: true,
      aliases: true,
      variants: { orderBy: { price: "asc" } },
    },
  });
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const t = product.translations.find((x) => x.locale === locale) || product.translations[0];

  // Related products (same category, exclude self)
  const related = await db.product.findMany({
    where: { categoryId: product.categoryId, status: "published", id: { not: id } },
    take: 6,
    include: { translations: true, brand: true, category: true, variants: true },
  });

  // Recipes using this product
  const recipeRows = await db.recipeIngredient.findMany({
    where: { productId: id },
    include: { recipe: { include: { translations: true } } },
    take: 6,
    distinct: ["recipeId"],
  });
  const relatedRecipes = recipeRows.map((r) => ({
    id: r.recipe.id, slug: r.recipe.slug, country: r.recipe.country, category: r.recipe.category,
    difficulty: r.recipe.difficulty, timeMinutes: r.recipe.timeMinutes, baseServings: r.recipe.baseServings,
    imageColor: r.recipe.imageColor, imageEmoji: r.recipe.imageEmoji,
    title: r.recipe.translations.find((t) => t.locale === locale)?.title || r.recipe.translations[0]?.title,
  }));

  // Alternatives: same category different product
  const alternatives = await db.product.findMany({
    where: { categoryId: product.categoryId, status: "published", id: { not: id }, stockQty: { gt: 0 } },
    take: 4,
    include: { translations: true, brand: true, category: true, variants: true },
  });

  const proj = (p: any) => ({
    id: p.id, sku: p.sku, traditionalName: p.traditionalName,
    name: p.translations?.find((x: any) => x.locale === locale)?.name || p.traditionalName,
    price: Number(p.price), promoPrice: p.promoPrice ? Number(p.promoPrice) : null,
    imageColor: p.imageColor, imageEmoji: p.imageEmoji, stockQty: p.stockQty,
    thermalClass: p.thermalClass, packaging: p.packaging,
  });

  let nutrition: any = null;
  try { nutrition = product.nutrition ? JSON.parse(product.nutrition) : null; } catch { nutrition = null; }

  return NextResponse.json({
    id: product.id,
    sku: product.sku,
    barcode: product.barcode,
    traditionalName: product.traditionalName,
    name: t?.name || product.traditionalName,
    description: t?.description || "",
    preparation: t?.preparation || null,
    storage: t?.storage || null,
    ingredients: t?.ingredients || null,
    allergens: t?.allergens || null,
    nutrition,
    country: product.country,
    thermalClass: product.thermalClass,
    storageType: product.storageType,
    storageTempC: product.storageTempC,
    netWeightGrams: product.netWeightGrams,
    volumeMl: product.volumeMl,
    unit: product.unit,
    packaging: product.packaging,
    price: Number(product.price),
    promoPrice: product.promoPrice ? Number(product.promoPrice) : null,
    pricePerKg: product.pricePerKg ? Number(product.pricePerKg) : null,
    stockQty: product.stockQty,
    reservedQty: product.reservedQty,
    alertThreshold: product.alertThreshold,
    imageColor: product.imageColor,
    imageEmoji: product.imageEmoji,
    isBestseller: product.isBestseller,
    isNew: product.isNew,
    isOnSale: product.isOnSale,
    brand: product.brand ? { id: product.brand.id, name: product.brand[`name${locale === "en" ? "En" : "Fr"}`] } : null,
    category: product.category ? { id: product.category.id, slug: product.category.slug, name: product.category[`name${locale === "en" ? "En" : "Fr"}`] } : null,
    aliases: product.aliases.map((a) => a.alias),
    variants: product.variants.map((v) => ({ id: v.id, label: v.label, weightGrams: v.weightGrams, volumeMl: v.volumeMl, price: Number(v.price), pricePerKg: v.pricePerKg ? Number(v.pricePerKg) : null, isDefault: v.isDefault })),
    related: related.map(proj),
    relatedRecipes,
    alternatives: alternatives.map(proj),
  });
}
