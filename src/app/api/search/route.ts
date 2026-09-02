import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { normalize } from "@/lib/format";
import { localizeDish, searchDishLibrary } from "@/lib/dish-library";
import { getProductPhoto, getRecipePhoto } from "@/lib/market-media";
import { enforceRateLimit } from "@/lib/redis";

export const dynamic = "force-dynamic";

/** Bilingual, accent-insensitive search across translations + aliases + traditional names. */
export async function GET(req: NextRequest) {
  const limited = await enforceRateLimit(req, "search");
  if (limited) return limited;

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim().slice(0, 120);
  const locale = (searchParams.get("locale") as "fr" | "en") || "fr";
  const requestedLimit = Number.parseInt(searchParams.get("limit") || "8", 10);
  const limit = Number.isFinite(requestedLimit) ? Math.max(1, Math.min(requestedLimit, 20)) : 8;

  if (!q || q.length < 1) {
    return NextResponse.json({ results: [], popular: ["Kplô", "Placali", "Attiéké", "Gombo", "Graine de palme", "Mafé"] });
  }

  const norm = normalize(q);

  // 1) exact alias matches (Kplô / Kplo / beef skin → same product)
  const [aliasMatches, nameMatches, recipeMatches] = await Promise.all([
    db.productAlias.findMany({
      where: { alias: { contains: norm } },
      take: 20,
      include: { product: { include: { translations: true, category: true } } },
    }),
    db.product.findMany({
      where: {
        status: "published",
        OR: [
          { traditionalName: { contains: q } },
          { sku: { contains: q } },
          { translations: { some: { name: { contains: q } } } },
        ],
      },
      take: 20,
      include: { translations: true, category: true },
    }),
    db.recipe.findMany({
      where: {
        status: "published",
        translations: { some: { title: { contains: q } } },
      },
      take: 4,
      include: { translations: true },
    }),
  ]);

  // merge & dedupe products
  const seen = new Set<string>();
  const results: any[] = [];
  for (const a of aliasMatches) {
    if (!seen.has(a.product.id) && a.product.status === "published") {
      seen.add(a.product.id);
      const t = a.product.translations.find((x) => x.locale === locale) || a.product.translations[0];
      results.push({
        kind: "product",
        id: a.product.id,
        name: t?.name || a.product.traditionalName,
        traditionalName: a.product.traditionalName,
        emoji: a.product.imageEmoji,
        imageUrl: getProductPhoto({
          traditionalName: a.product.traditionalName,
          name: t?.name,
          imageUrl: a.product.imageUrl,
          imageEmoji: a.product.imageEmoji,
          category: a.product.category ? { slug: a.product.category.slug, name: a.product.category.nameFr } : null,
        }),
        color: a.product.imageColor,
        price: Number(a.product.price),
        promoPrice: a.product.promoPrice ? Number(a.product.promoPrice) : null,
        country: a.product.country,
        thermalClass: a.product.thermalClass,
        packaging: a.product.packaging,
        availableStock: Math.max(0, a.product.stockQty - a.product.reservedQty),
        category: a.product.category ? {
          id: a.product.category.id,
          slug: a.product.category.slug,
          name: a.product.category[`name${locale === "en" ? "En" : "Fr"}`],
          color: a.product.category.color,
        } : null,
        matchedAlias: a.alias,
      });
    }
  }
  for (const p of nameMatches) {
    if (!seen.has(p.id)) {
      seen.add(p.id);
      const t = p.translations.find((x) => x.locale === locale) || p.translations[0];
      results.push({
        kind: "product",
        id: p.id,
        name: t?.name || p.traditionalName,
        traditionalName: p.traditionalName,
        emoji: p.imageEmoji,
        imageUrl: getProductPhoto({
          traditionalName: p.traditionalName,
          name: t?.name,
          imageUrl: p.imageUrl,
          imageEmoji: p.imageEmoji,
          category: p.category ? { slug: p.category.slug, name: p.category.nameFr } : null,
        }),
        color: p.imageColor,
        price: Number(p.price),
        promoPrice: p.promoPrice ? Number(p.promoPrice) : null,
        country: p.country,
        thermalClass: p.thermalClass,
        packaging: p.packaging,
        availableStock: Math.max(0, p.stockQty - p.reservedQty),
        category: p.category ? {
          id: p.category.id,
          slug: p.category.slug,
          name: p.category[`name${locale === "en" ? "En" : "Fr"}`],
          color: p.category.color,
        } : null,
        matchedAlias: null,
      });
    }
  }

  const recipes = recipeMatches.map((r) => {
    const name = r.translations.find((translation) => translation.locale === locale)?.title || r.translations[0]?.title;
    return {
      kind: "recipe",
      id: r.id,
      slug: r.slug,
      name,
      emoji: r.imageEmoji,
      imageUrl: getRecipePhoto({ slug: r.slug, title: name, country: r.country, category: r.category, imageUrl: r.imageUrl }),
      color: r.imageColor,
      country: r.country,
      category: r.category,
      difficulty: r.difficulty,
      timeMinutes: r.timeMinutes,
      baseServings: r.baseServings,
    };
  });

  const dishes = searchDishLibrary({ query: q, limit: 4 }).map(({ dish, score }) => localizeDish(dish, locale, score));

  return NextResponse.json({ results: results.slice(0, limit), recipes, dishes });
}
