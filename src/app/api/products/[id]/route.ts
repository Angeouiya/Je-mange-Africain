import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getProductPhoto, getRecipePhoto } from "@/lib/market-media";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const locale = (searchParams.get("locale") as "fr" | "en") || "fr";

  const product = await db.product.findFirst({
    where: { id, status: "published" },
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

  const fr = product.translations.find((x) => x.locale === "fr") || product.translations[0];
  const en = product.translations.find((x) => x.locale === "en") || fr;
  const t = locale === "en" ? en : fr;

  // Related products (same category, exclude self)
  const related = await db.product.findMany({
    where: { categoryId: product.categoryId, status: "published", id: { not: id } },
    take: 6,
    include: { translations: true, brand: true, category: true, variants: true },
  });

  // Recipes using this product
  const recipeRows = await db.recipeIngredient.findMany({
    where: { productId: id, recipe: { status: "published" } },
    include: { recipe: { include: { translations: true } } },
    take: 6,
    distinct: ["recipeId"],
  });
  const relatedRecipes = recipeRows.map((r) => {
    const title = r.recipe.translations.find((translation) => translation.locale === locale)?.title || r.recipe.translations[0]?.title;
    return {
      id: r.recipe.id, slug: r.recipe.slug, country: r.recipe.country, category: r.recipe.category,
      difficulty: r.recipe.difficulty, timeMinutes: r.recipe.timeMinutes, baseServings: r.recipe.baseServings,
      imageColor: r.recipe.imageColor, imageEmoji: r.recipe.imageEmoji,
      imageUrl: getRecipePhoto({ slug: r.recipe.slug, title, country: r.recipe.country, category: r.recipe.category, imageUrl: r.recipe.imageUrl }),
      title,
    };
  });

  // Alternatives: same category different product
  const alternatives = await db.product.findMany({
    where: { categoryId: product.categoryId, status: "published", id: { not: id }, stockQty: { gt: 0 } },
    take: 4,
    include: { translations: true, brand: true, category: true, variants: true },
  });

  const proj = (p: any) => {
    const relatedFr = p.translations?.find((x: any) => x.locale === "fr") || p.translations?.[0];
    const relatedEn = p.translations?.find((x: any) => x.locale === "en") || relatedFr;
    return {
      id: p.id, sku: p.sku, traditionalName: p.traditionalName,
      name: (locale === "en" ? relatedEn : relatedFr)?.name || p.traditionalName,
      nameFr: relatedFr?.name || p.traditionalName,
      nameEn: relatedEn?.name || relatedFr?.name || p.traditionalName,
      price: Number(p.price), promoPrice: p.promoPrice ? Number(p.promoPrice) : null,
      pricePerKg: p.pricePerKg ? Number(p.pricePerKg) : null,
      imageColor: p.imageColor, imageEmoji: p.imageEmoji,
      imageUrl: getProductPhoto({
        traditionalName: p.traditionalName,
        name: (locale === "en" ? relatedEn : relatedFr)?.name,
        imageUrl: p.imageUrl,
        imageEmoji: p.imageEmoji,
        category: p.category ? { slug: p.category.slug, name: p.category.nameFr } : null,
      }),
      stockQty: p.stockQty,
      alertThreshold: p.alertThreshold,
      country: p.country,
      thermalClass: p.thermalClass, packaging: p.packaging,
      isBestseller: p.isBestseller,
      isNew: p.isNew,
      isOnSale: p.isOnSale,
      brandName: p.brand?.[`name${locale === "en" ? "En" : "Fr"}`] || p.brand?.nameFr || null,
      category: p.category ? { id: p.category.id, slug: p.category.slug, name: p.category[`name${locale === "en" ? "En" : "Fr"}`], color: p.category.color } : null,
      variants: p.variants?.map((v: any) => ({ id: v.id, label: v.label, weightGrams: v.weightGrams, volumeMl: v.volumeMl, price: Number(v.price), pricePerKg: v.pricePerKg ? Number(v.pricePerKg) : null, isDefault: v.isDefault })) || [],
    };
  };

  let nutrition: any = null;
  try { nutrition = product.nutrition ? JSON.parse(product.nutrition) : null; } catch { nutrition = null; }

  return NextResponse.json({
    id: product.id,
    sku: product.sku,
    barcode: product.barcode,
    traditionalName: product.traditionalName,
    name: t?.name || product.traditionalName,
    nameFr: fr?.name || product.traditionalName,
    nameEn: en?.name || fr?.name || product.traditionalName,
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
    imageUrl: getProductPhoto({
      traditionalName: product.traditionalName,
      name: t?.name,
      description: t?.description,
      imageUrl: product.imageUrl,
      imageEmoji: product.imageEmoji,
      category: { slug: product.category.slug, name: product.category.nameFr },
    }),
    galleryUrls: (() => { try { return product.galleryUrls ? JSON.parse(product.galleryUrls) : []; } catch { return []; } })(),
    isBestseller: product.isBestseller,
    isNew: product.isNew,
    isRecommended: product.isRecommended,
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
