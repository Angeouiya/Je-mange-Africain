import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authorizeAdminRequest } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await authorizeAdminRequest(request);
  if (!authorization.ok) return authorization.response;

  const { id } = await params;
  const locale = new URL(request.url).searchParams.get("locale") === "en" ? "en" : "fr";
  const recipe = await db.recipe.findUnique({
    where: { id },
    include: {
      translations: true,
      ingredients: {
        include: {
          product: { include: { translations: true, variants: true } },
        },
      },
    },
  });
  if (!recipe) return NextResponse.json({ error: "Recette introuvable." }, { status: 404 });

  const translation = recipe.translations.find((item) => item.locale === locale) || recipe.translations[0];
  let steps: string[] = [];
  try { steps = translation?.steps ? JSON.parse(translation.steps) : []; } catch { steps = []; }

  return NextResponse.json({
    id: recipe.id,
    slug: recipe.slug,
    country: recipe.country,
    category: recipe.category,
    difficulty: recipe.difficulty,
    timeMinutes: recipe.timeMinutes,
    baseServings: recipe.baseServings,
    imageColor: recipe.imageColor,
    imageEmoji: recipe.imageEmoji,
    isPopular: recipe.isPopular,
    status: recipe.status,
    title: translation?.title,
    description: translation?.description,
    steps,
    ingredients: recipe.ingredients.map((ingredient) => ({
      recipeIngredientId: ingredient.id,
      quantityPerBase: ingredient.quantityPerBase,
      unit: ingredient.unit,
      role: ingredient.role,
      optional: ingredient.optional,
      product: {
        id: ingredient.product.id,
        traditionalName: ingredient.product.traditionalName,
        emoji: ingredient.product.imageEmoji,
        nameFr: ingredient.product.translations.find((item) => item.locale === "fr")?.name || ingredient.product.traditionalName,
        nameEn: ingredient.product.translations.find((item) => item.locale === "en")?.name || ingredient.product.traditionalName,
        stockQty: ingredient.product.stockQty,
      },
    })),
  });
}
