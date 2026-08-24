import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { normalize } from "@/lib/format";

export const dynamic = "force-dynamic";

/** Localized product projection for storefront. */
function project(p: any, locale: string) {
  const t = p.translations?.find((x: any) => x.locale === locale) || p.translations?.[0];
  return {
    id: p.id,
    sku: p.sku,
    barcode: p.barcode,
    traditionalName: p.traditionalName,
    name: t?.name || p.traditionalName,
    description: t?.description || "",
    preparation: t?.preparation || null,
    storage: t?.storage || null,
    ingredients: t?.ingredients || null,
    allergens: t?.allergens || null,
    country: p.country,
    thermalClass: p.thermalClass,
    storageType: p.storageType,
    storageTempC: p.storageTempC,
    netWeightGrams: p.netWeightGrams,
    volumeMl: p.volumeMl,
    unit: p.unit,
    packaging: p.packaging,
    price: Number(p.price),
    promoPrice: p.promoPrice ? Number(p.promoPrice) : null,
    pricePerKg: p.pricePerKg ? Number(p.pricePerKg) : null,
    stockQty: p.stockQty,
    alertThreshold: p.alertThreshold,
    imageColor: p.imageColor,
    imageEmoji: p.imageEmoji,
    isBestseller: p.isBestseller,
    isNew: p.isNew,
    isOnSale: p.isOnSale,
    categoryId: p.categoryId,
    brandId: p.brandId,
    brandName: p.brand?.[`name${locale === "en" ? "En" : "Fr"}`] || p.brand?.nameFr,
    category: p.category ? { id: p.category.id, slug: p.category.slug, name: p.category[`name${locale === "en" ? "En" : "Fr"}`], icon: p.category.icon, color: p.category.color } : null,
    variants: p.variants?.map((v: any) => ({ id: v.id, label: v.label, weightGrams: v.weightGrams, volumeMl: v.volumeMl, price: Number(v.price), pricePerKg: v.pricePerKg ? Number(v.pricePerKg) : null, isDefault: v.isDefault })) || [],
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const locale = (searchParams.get("locale") as "fr" | "en") || "fr";
  const section = searchParams.get("section"); // home | list
  const category = searchParams.get("category");
  const brand = searchParams.get("brand");
  const country = searchParams.get("country");
  const thermal = searchParams.get("thermal");
  const q = searchParams.get("q");
  const sort = searchParams.get("sort") || "popular";
  const maxPrice = searchParams.get("maxPrice");
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "12", 10);

  if (section === "home") {
    const [bestsellers, news, onSale, categories, brands, popularRecipes] = await Promise.all([
      db.product.findMany({ where: { status: "published", isBestseller: true }, take: 8, include: { translations: true, brand: true, category: true, variants: true } }),
      db.product.findMany({ where: { status: "published", isNew: true }, take: 8, include: { translations: true, brand: true, category: true, variants: true } }),
      db.product.findMany({ where: { status: "published", isOnSale: true }, take: 8, include: { translations: true, brand: true, category: true, variants: true } }),
      db.category.findMany({ orderBy: { sortOrder: "asc" } }),
      db.brand.findMany(),
      db.recipe.findMany({ where: { status: "published", isPopular: true }, take: 6, include: { translations: true } }),
    ]);
    return NextResponse.json({
      bestsellers: bestsellers.map((p) => project(p, locale)),
      news: news.map((p) => project(p, locale)),
      onSale: onSale.map((p) => project(p, locale)),
      categories: categories.map((c) => ({ id: c.id, slug: c.slug, nameFr: c.nameFr, nameEn: c.nameEn, name: c[`name${locale === "en" ? "En" : "Fr"}`], icon: c.icon, color: c.color, description: c[`description${locale === "en" ? "En" : "Fr"}`] })),
      brands: brands.map((b) => ({ id: b.id, slug: b.slug, name: b[`name${locale === "en" ? "En" : "Fr"}`] })),
      popularRecipes: popularRecipes.map((r) => ({
        id: r.id, slug: r.slug, country: r.country, category: r.category, difficulty: r.difficulty,
        timeMinutes: r.timeMinutes, baseServings: r.baseServings, imageColor: r.imageColor, imageEmoji: r.imageEmoji,
        title: r.translations.find((t) => t.locale === locale)?.title || r.translations[0]?.title,
        description: r.translations.find((t) => t.locale === locale)?.description,
      })),
    });
  }

  // list with filters
  const where: any = { status: "published" };
  if (category) where.categoryId = category;
  if (brand) where.brandId = brand;
  if (country) where.country = country;
  if (thermal) where.thermalClass = thermal;
  if (maxPrice) where.price = { lte: parseFloat(maxPrice) };
  if (q) {
    const norm = normalize(q);
    where.OR = [
      { traditionalName: { contains: q } },
      { sku: { contains: q } },
      { aliases: { some: { alias: { contains: norm } } } },
      { translations: { some: { OR: [{ name: { contains: q } }, { description: { contains: q } }] } } },
    ];
  }

  let orderBy: any = [{ createdAt: "desc" }];
  if (sort === "popular") orderBy = [{ isBestseller: "desc" }, { stockQty: "desc" }];
  if (sort === "priceAsc") orderBy = [{ price: "asc" }];
  if (sort === "priceDesc") orderBy = [{ price: "desc" }];
  if (sort === "new") orderBy = [{ isNew: "desc" }, { createdAt: "desc" }];
  if (sort === "available") orderBy = [{ stockQty: "desc" }];

  const [total, products] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { translations: true, brand: true, category: true, variants: true },
    }),
  ]);

  const [categories, brands, countries] = await Promise.all([
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
    db.brand.findMany(),
    db.product.findMany({ where: { status: "published" }, select: { country: true }, distinct: ["country"] }),
  ]);

  return NextResponse.json({
    products: products.map((p) => project(p, locale)),
    total,
    page,
    pageSize,
    pages: Math.ceil(total / pageSize),
    filters: {
      categories: categories.map((c) => ({ id: c.id, slug: c.slug, name: c[`name${locale === "en" ? "En" : "Fr"}`], color: c.color })),
      brands: brands.map((b) => ({ id: b.id, slug: b.slug, name: b[`name${locale === "en" ? "En" : "Fr"}`] })),
      countries: countries.map((c) => c.country),
    },
  });
}
