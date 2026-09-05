import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { normalize } from "@/lib/format";
import { getProductPhoto, getRecipePhoto } from "@/lib/market-media";
import { wholesaleAvailablePacks, wholesaleDiscountPercent, wholesaleTiers } from "@/lib/wholesale";
import { retailAvailableUnits } from "@/lib/inventory";

export const dynamic = "force-dynamic";

/** Localized product projection for storefront. */
function project(p: any, locale: string) {
  const fr = p.translations?.find((x: any) => x.locale === "fr") || p.translations?.[0];
  const en = p.translations?.find((x: any) => x.locale === "en") || fr;
  const t = locale === "en" ? en : fr;
  const availableQty = retailAvailableUnits(p.stockQty, p.reservedQty);
  return {
    id: p.id,
    sku: p.sku,
    barcode: p.barcode,
    traditionalName: p.traditionalName,
    name: t?.name || p.traditionalName,
    nameFr: fr?.name || p.traditionalName,
    nameEn: en?.name || fr?.name || p.traditionalName,
    description: t?.description || "",
    descriptionFr: fr?.description || "",
    descriptionEn: en?.description || fr?.description || "",
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
    isWholesale: p.isWholesale,
    wholesalePackLabel: p.wholesalePackLabel,
    wholesaleUnitsPerPack: p.wholesaleUnitsPerPack,
    wholesaleMinPacks: p.wholesaleMinPacks,
    wholesalePrice: p.wholesalePrice ? Number(p.wholesalePrice) : null,
    wholesaleTiers: wholesaleTiers({
      wholesaleMinPacks: p.wholesaleMinPacks,
      wholesalePrice: p.wholesalePrice ? Number(p.wholesalePrice) : null,
      wholesaleTier2MinPacks: p.wholesaleTier2MinPacks,
      wholesaleTier2Price: p.wholesaleTier2Price ? Number(p.wholesaleTier2Price) : null,
      wholesaleTier3MinPacks: p.wholesaleTier3MinPacks,
      wholesaleTier3Price: p.wholesaleTier3Price ? Number(p.wholesaleTier3Price) : null,
    }),
    wholesaleAvailablePacks: wholesaleAvailablePacks(p.stockQty, p.reservedQty, p.wholesaleUnitsPerPack),
    wholesaleDiscountPercent: p.wholesalePrice ? wholesaleDiscountPercent(Number(p.price), p.wholesaleUnitsPerPack, Number(p.wholesalePrice)) : 0,
    stockQty: availableQty,
    alertThreshold: p.alertThreshold,
    imageColor: p.imageColor,
    imageEmoji: p.imageEmoji,
    imageUrl: getProductPhoto({
      traditionalName: p.traditionalName,
      name: t?.name,
      description: t?.description,
      imageUrl: p.imageUrl,
      imageEmoji: p.imageEmoji,
      category: p.category ? { slug: p.category.slug, name: p.category.nameFr } : null,
    }),
    isBestseller: p.isBestseller,
    isNew: p.isNew,
    isRecommended: p.isRecommended,
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
  const channel = searchParams.get("channel") === "wholesale" ? "wholesale" : "retail";
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
      popularRecipes: popularRecipes.map((r) => {
        const translation = r.translations.find((item) => item.locale === locale) || r.translations[0];
        return {
          id: r.id, slug: r.slug, country: r.country, category: r.category, difficulty: r.difficulty,
          timeMinutes: r.timeMinutes, baseServings: r.baseServings, imageColor: r.imageColor, imageEmoji: r.imageEmoji,
          imageUrl: getRecipePhoto({ slug: r.slug, title: translation?.title, country: r.country, category: r.category, imageUrl: r.imageUrl }),
          isNew: r.isNew, isRecommended: r.isRecommended, isPopular: r.isPopular,
          title: translation?.title,
          description: translation?.description,
        };
      }),
    });
  }

  // list with filters
  const where: any = { status: "published", ...(channel === "wholesale" ? { isWholesale: true, wholesalePrice: { not: null } } : {}) };
  if (category) where.categoryId = category;
  if (brand) where.brandId = brand;
  if (country) where.country = country;
  if (thermal) where.thermalClass = thermal;
  if (maxPrice) where[channel === "wholesale" ? "wholesalePrice" : "price"] = { lte: parseFloat(maxPrice) };
  if (q) {
    const norm = normalize(q);
    where.OR = [
      { traditionalName: { contains: q } },
      { sku: { contains: q } },
      { country: { contains: q } },
      { aliases: { some: { alias: { contains: norm } } } },
      { category: { OR: [{ nameFr: { contains: q } }, { nameEn: { contains: q } }] } },
      { brand: { OR: [{ nameFr: { contains: q } }, { nameEn: { contains: q } }] } },
      { translations: { some: { OR: [{ name: { contains: q } }, { description: { contains: q } }, { ingredients: { contains: q } }] } } },
    ];
  }

  let orderBy: any = [{ createdAt: "desc" }];
  if (sort === "popular") orderBy = [{ isBestseller: "desc" }, { stockQty: "desc" }];
  if (sort === "priceAsc") orderBy = [{ [channel === "wholesale" ? "wholesalePrice" : "price"]: "asc" }];
  if (sort === "priceDesc") orderBy = [{ [channel === "wholesale" ? "wholesalePrice" : "price"]: "desc" }];
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
