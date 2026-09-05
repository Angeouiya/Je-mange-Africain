import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { getBrandAccentColor, getRecipePhoto } from "@/lib/market-media";
import { recipeStepCount, recipeStockReadiness } from "@/lib/recipe-operations";
import { recipeAdminInput, recipeSlug, recipeStepDetailsForLocale } from "@/lib/admin-recipe-schema";
import { serializeRecipeSteps } from "@/lib/recipe-step-storage";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authorization = await authorizeAdminRequest(request, { module: "recipes", action: "read" });
  if (!authorization.ok) return authorization.response;

  const locale = new URL(request.url).searchParams.get("locale") === "en" ? "en" : "fr";
  const recipes = await db.recipe.findMany({
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    include: {
      translations: true,
      ingredients: { include: { product: { select: { stockQty: true, reservedQty: true, status: true } } } },
    },
  });

  return NextResponse.json({
    recipes: recipes.map((recipe) => {
      const translation = recipe.translations.find((item) => item.locale === locale) || recipe.translations[0];
      const readiness = recipeStockReadiness(recipe.ingredients);
      return {
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
        galleryUrls: (() => { try { return recipe.galleryUrls ? JSON.parse(recipe.galleryUrls) : []; } catch { return []; } })(),
        isPopular: recipe.isPopular,
        isNew: recipe.isNew,
        isRecommended: recipe.isRecommended,
        status: recipe.status,
        ingredientCount: recipe.ingredients.length,
        stepCount: recipeStepCount(translation?.steps),
        ...readiness,
        updatedAt: recipe.updatedAt.toISOString(),
        title: translation?.title,
        description: translation?.description,
      };
    }),
  });
}

export async function POST(request: NextRequest) {
  const authorization = await authorizeAdminRequest(request, { module: "recipes", action: "create" });
  if (!authorization.ok) return authorization.response;

  const parsed = recipeAdminInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "La recette est incomplète ou contient des valeurs invalides.", details: parsed.error.flatten() }, { status: 400 });
  }

  const input = parsed.data;
  const productIds = Array.from(new Set(input.ingredients.map((ingredient) => ingredient.productId)));
  const products = await db.product.findMany({
    where: { id: { in: productIds } },
    include: { variants: true },
  });
  if (products.length !== productIds.length) {
    return NextResponse.json({ error: "Un ou plusieurs ingrédients ne correspondent plus au catalogue." }, { status: 400 });
  }

  const productsById = new Map(products.map((product) => [product.id, product]));
  const invalidVariant = input.ingredients.some((ingredient) => ingredient.variantId && !productsById.get(ingredient.productId)?.variants.some((variant) => variant.id === ingredient.variantId));
  if (invalidVariant) return NextResponse.json({ error: "Un conditionnement sélectionné ne correspond pas à son produit." }, { status: 400 });

  const baseSlug = recipeSlug(input.titleFr) || `recette-${Date.now()}`;
  const existingSlugs = await db.recipe.findMany({ where: { slug: { startsWith: baseSlug } }, select: { slug: true } });
  const slugSet = new Set(existingSlugs.map((recipe) => recipe.slug));
  let slug = baseSlug;
  let suffix = 2;
  while (slugSet.has(slug)) slug = `${baseSlug}-${suffix++}`;

  const recipe = await db.$transaction(async (transaction) => {
    const created = await transaction.recipe.create({
      data: {
        slug,
        country: input.country,
        category: input.category,
        difficulty: input.difficulty,
        timeMinutes: input.timeMinutes,
        baseServings: input.baseServings,
        imageColor: getBrandAccentColor(input.imageColor),
        imageEmoji: input.imageEmoji,
        imageUrl: input.imageUrl,
        isPopular: input.isPopular,
        isNew: input.isNew,
        isRecommended: input.isRecommended,
        status: input.status,
        translations: {
          create: [
            { locale: "fr", title: input.titleFr, description: input.descriptionFr, steps: serializeRecipeSteps(input.stepsFr, recipeStepDetailsForLocale(input, "fr"), "fr") },
            { locale: "en", title: input.titleEn, description: input.descriptionEn, steps: serializeRecipeSteps(input.stepsEn, recipeStepDetailsForLocale(input, "en"), "en") },
          ],
        },
        ingredients: {
          create: input.ingredients.map((ingredient) => ({
            productId: ingredient.productId,
            variantId: ingredient.variantId || null,
            quantityPerBase: ingredient.quantityPerBase,
            unit: ingredient.unit,
            role: ingredient.role,
            optional: ingredient.optional,
            note: ingredient.note || null,
          })),
        },
      },
    });

    await transaction.auditLog.create({
      data: {
        action: "recipe_create",
        entityType: "Recipe",
        entityId: created.id,
        after: JSON.stringify({ slug, titleFr: input.titleFr, status: input.status, imageUrl: input.imageUrl, isNew: input.isNew, isRecommended: input.isRecommended, isPopular: input.isPopular, ingredientCount: input.ingredients.length, stepCount: input.stepsFr.length }),
        reason: `Création depuis le studio recettes par ${authorization.user.email}`,
      },
    });
    return created;
  });

  return NextResponse.json({ recipe: { id: recipe.id, slug: recipe.slug, status: recipe.status } }, { status: 201 });
}
