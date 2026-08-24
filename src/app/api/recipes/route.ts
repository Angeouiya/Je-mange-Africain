import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const locale = (searchParams.get("locale") as "fr" | "en") || "fr";
  const category = searchParams.get("category");

  const where: any = { status: "published" };
  if (category) where.category = category;

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
