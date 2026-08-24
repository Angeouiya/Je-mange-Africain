import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { normalize } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const locale = (searchParams.get("locale") as "fr" | "en") || "fr";
  const category = searchParams.get("category");
  const q = searchParams.get("q")?.trim();

  const where: any = { status: "published" };
  if (category) where.category = category;
  if (q) {
    const norm = normalize(q);
    where.OR = [
      { country: { contains: q } },
      { category: { contains: q } },
      { translations: { some: { OR: [{ title: { contains: q } }, { description: { contains: q } }] } } },
      {
        ingredients: {
          some: {
            product: {
              OR: [
                { traditionalName: { contains: q } },
                { aliases: { some: { alias: { contains: q } } } },
                { translations: { some: { OR: [{ name: { contains: q } }, { description: { contains: q } }] } } },
              ],
            },
          },
        },
      },
    ];
    if (norm.includes("rapide") || norm.includes("quick") || norm.includes("diner") || norm.includes("dinner")) {
      where.OR.push({ timeMinutes: { lte: 40 } });
    }
    if (norm.includes("poisson") || norm.includes("fish")) {
      where.OR.push({ ingredients: { some: { product: { category: { slug: "poissons" } } } } });
    }
    if (norm.includes("viande") || norm.includes("meat") || norm.includes("poulet") || norm.includes("chicken")) {
      where.OR.push({ ingredients: { some: { product: { category: { slug: "viandes" } } } } });
    }
    if (norm.includes("plantain") || norm.includes("alloco")) {
      where.OR.push({ translations: { some: { title: { contains: "Alloco" } } } });
    }
  }

  const recipes = await db.recipe.findMany({
    where,
    orderBy: [{ isPopular: "desc" }, { createdAt: "desc" }],
    include: { translations: true, ingredients: { include: { product: { include: { translations: true } } } } },
  });

  const categories = [
    { slug: "sauces", fr: "Sauces", en: "Sauces" },
    { slug: "mains", fr: "Plats complets", en: "Full dishes" },
    { slug: "sides", fr: "Accompagnements", en: "Sides" },
    { slug: "grill", fr: "Grillades", en: "Grills" },
    { slug: "drinks", fr: "Boissons", en: "Drinks" },
    { slug: "desserts", fr: "Desserts", en: "Desserts" },
  ];

  return NextResponse.json({
    recipes: recipes.map((r) => ({
      id: r.id,
      slug: r.slug,
      country: r.country,
      category: r.category,
      difficulty: r.difficulty,
      timeMinutes: r.timeMinutes,
      baseServings: r.baseServings,
      imageColor: r.imageColor,
      imageEmoji: r.imageEmoji,
      isPopular: r.isPopular,
      ingredientCount: r.ingredients.length,
      title: r.translations.find((t) => t.locale === locale)?.title || r.translations[0]?.title,
      description: r.translations.find((t) => t.locale === locale)?.description,
    })),
    categories: categories.map((c) => ({ slug: c.slug, name: c[locale === "en" ? "en" : "fr"] })),
  });
}
