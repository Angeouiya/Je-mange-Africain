import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { z } from "zod";
import { getBrandAccentColor, getProductPhoto, getRecipePhoto } from "@/lib/market-media";

export const dynamic = "force-dynamic";

const RecipeEditorialInput = z.object({
  imageUrl: z.string().url().max(1000),
  galleryUrls: z.array(z.string().url().max(1000)).max(8).default([]),
  status: z.enum(["draft", "published", "archived"]),
  isNew: z.boolean(),
  isRecommended: z.boolean(),
  isPopular: z.boolean(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await authorizeAdminRequest(request, { module: "recipes", action: "read" });
  if (!authorization.ok) return authorization.response;

  const { id } = await params;
  const locale = new URL(request.url).searchParams.get("locale") === "en" ? "en" : "fr";
  const recipe = await db.recipe.findUnique({
    where: { id },
    include: {
      translations: true,
      ingredients: {
        include: {
          product: { include: { translations: true, variants: true, category: true } },
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
    imageColor: getBrandAccentColor(recipe.imageColor),
    imageEmoji: recipe.imageEmoji,
    imageUrl: getRecipePhoto({ slug: recipe.slug, title: translation?.title, country: recipe.country, category: recipe.category, imageUrl: recipe.imageUrl }),
    isPopular: recipe.isPopular,
    isNew: recipe.isNew,
    isRecommended: recipe.isRecommended,
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
        imageUrl: getProductPhoto({
          traditionalName: ingredient.product.traditionalName,
          imageUrl: ingredient.product.imageUrl,
          imageEmoji: ingredient.product.imageEmoji,
          category: { slug: ingredient.product.category.slug, name: ingredient.product.category.nameFr },
        }),
        color: getBrandAccentColor(ingredient.product.imageColor),
        nameFr: ingredient.product.translations.find((item) => item.locale === "fr")?.name || ingredient.product.traditionalName,
        nameEn: ingredient.product.translations.find((item) => item.locale === "en")?.name || ingredient.product.traditionalName,
        stockQty: ingredient.product.stockQty,
      },
    })),
  });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await authorizeAdminRequest(request, { module: "recipes", action: "update" });
  if (!authorization.ok) return authorization.response;
  const parsed = RecipeEditorialInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Les paramètres éditoriaux de la recette sont invalides." }, { status: 400 });
  const { id } = await params;
  const before = await db.recipe.findUnique({ where: { id }, select: { imageUrl: true, galleryUrls: true, status: true, isNew: true, isRecommended: true, isPopular: true } });
  if (!before) return NextResponse.json({ error: "Recette introuvable." }, { status: 404 });
  const recipe = await db.recipe.update({
    where: { id },
    data: { ...parsed.data, galleryUrls: JSON.stringify(parsed.data.galleryUrls) },
    select: { id: true, imageUrl: true, status: true, isNew: true, isRecommended: true, isPopular: true },
  });
  await db.auditLog.create({ data: { action: "recipe_editorial_update", entityType: "Recipe", entityId: id, before: JSON.stringify(before), after: JSON.stringify(parsed.data), reason: `Mise à jour par ${authorization.user.email}` } });
  return NextResponse.json({ recipe });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await authorizeAdminRequest(request, { module: "recipes", action: "delete" });
  if (!authorization.ok) return authorization.response;
  const { id } = await params;
  const recipe = await db.recipe.findUnique({ where: { id }, include: { translations: { take: 1 } } });
  if (!recipe) return NextResponse.json({ error: "Recette introuvable." }, { status: 404 });
  await db.$transaction(async (transaction) => {
    await transaction.recipe.delete({ where: { id } });
    await transaction.auditLog.create({ data: { action: "recipe_delete", entityType: "Recipe", entityId: id, before: JSON.stringify({ slug: recipe.slug, title: recipe.translations[0]?.title }), reason: `Suppression définitive par ${authorization.user.email}` } });
  });
  return NextResponse.json({ ok: true });
}
