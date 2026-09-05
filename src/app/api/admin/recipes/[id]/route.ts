import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { z } from "zod";
import { getBrandAccentColor, getProductPhoto, getRecipePhoto } from "@/lib/market-media";
import { recipeAdminInput, recipeImageReference, recipeStepDetailsForLocale, type RecipeAdminInput } from "@/lib/admin-recipe-schema";
import { parseRecipeSteps, serializeRecipeSteps } from "@/lib/recipe-step-storage";
import { retailAvailableUnits } from "@/lib/inventory";
import { parseRecipeAlternativeIds, serializeRecipeAlternativeIds } from "@/lib/recipe-alternatives";

export const dynamic = "force-dynamic";

const RecipeEditorialInput = z.object({
  imageUrl: recipeImageReference,
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
  const french = recipe.translations.find((item) => item.locale === "fr");
  const english = recipe.translations.find((item) => item.locale === "en");
  const steps = parseRecipeSteps(translation?.steps, locale);
  const frenchSteps = parseRecipeSteps(french?.steps, "fr");
  const englishSteps = parseRecipeSteps(english?.steps, "en");
  const stepDetails = Array.from({ length: Math.max(frenchSteps.length, englishSteps.length) }, (_, index) => {
    const frenchStep = frenchSteps[index];
    const englishStep = englishSteps[index];
    const timing = frenchStep || englishStep;
    return {
      durationMinutes: timing?.durationMinutes || 5,
      restMinutes: timing?.restMinutes || 0,
      heat: timing?.heat || "none",
      temperatureC: timing?.temperatureC || null,
      equipmentFr: frenchStep?.equipment || "",
      equipmentEn: englishStep?.equipment || "",
      cueFr: frenchStep?.cue || "",
      cueEn: englishStep?.cue || "",
      tipFr: frenchStep?.tip || "",
      tipEn: englishStep?.tip || "",
      warningFr: frenchStep?.warning || "",
      warningEn: englishStep?.warning || "",
    };
  });

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
    galleryUrls: (() => { try { return recipe.galleryUrls ? JSON.parse(recipe.galleryUrls) : []; } catch { return []; } })(),
    isPopular: recipe.isPopular,
    isNew: recipe.isNew,
    isRecommended: recipe.isRecommended,
    status: recipe.status,
    title: translation?.title,
    description: translation?.description,
    steps: steps.map((step) => step.instruction),
    titleFr: french?.title || "",
    titleEn: english?.title || "",
    descriptionFr: french?.description || "",
    descriptionEn: english?.description || "",
    stepsFr: frenchSteps.map((step) => step.instruction),
    stepsEn: englishSteps.map((step) => step.instruction),
    stepDetails,
    ingredients: recipe.ingredients.map((ingredient) => ({
      recipeIngredientId: ingredient.id,
      productId: ingredient.productId,
      variantId: ingredient.variantId,
      quantityPerBase: ingredient.quantityPerBase,
      unit: ingredient.unit,
      role: ingredient.role,
      optional: ingredient.optional,
      alternativeProductIds: parseRecipeAlternativeIds(ingredient.alternatives),
      note: ingredient.note,
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
        reservedQty: ingredient.product.reservedQty,
        availableQty: retailAvailableUnits(ingredient.product.stockQty, ingredient.product.reservedQty),
      },
    })),
  });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await authorizeAdminRequest(request, { module: "recipes", action: "update" });
  if (!authorization.ok) return authorization.response;
  const body = await request.json().catch(() => null);
  const { id } = await params;
  const fullRecipe = recipeAdminInput.safeParse(body);
  if (fullRecipe.success) return updateFullRecipe(id, fullRecipe.data, authorization.user.email);

  const parsed = RecipeEditorialInput.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Les paramètres éditoriaux de la recette sont invalides." }, { status: 400 });
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

async function updateFullRecipe(id: string, input: RecipeAdminInput, adminEmail: string) {
  const productIds = Array.from(new Set(input.ingredients.flatMap((ingredient) => [ingredient.productId, ...ingredient.alternativeProductIds])));
  const [before, products] = await Promise.all([
    db.recipe.findUnique({ where: { id }, include: { translations: true, ingredients: true } }),
    db.product.findMany({ where: { id: { in: productIds } }, include: { variants: true } }),
  ]);
  if (!before) return NextResponse.json({ error: "Recette introuvable." }, { status: 404 });
  if (products.length !== productIds.length) return NextResponse.json({ error: "Un ou plusieurs ingrédients ou alternatives ne correspondent plus au catalogue." }, { status: 400 });

  const productsById = new Map(products.map((product) => [product.id, product]));
  const invalidVariant = input.ingredients.some((ingredient) => ingredient.variantId && !productsById.get(ingredient.productId)?.variants.some((variant) => variant.id === ingredient.variantId));
  if (invalidVariant) return NextResponse.json({ error: "Un conditionnement sélectionné ne correspond pas à son produit." }, { status: 400 });

  const recipe = await db.$transaction(async (transaction) => {
    const updated = await transaction.recipe.update({
      where: { id },
      data: {
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
      },
      select: { id: true, slug: true, status: true },
    });
    await transaction.recipeTranslation.upsert({
      where: { recipeId_locale: { recipeId: id, locale: "fr" } },
      create: { recipeId: id, locale: "fr", title: input.titleFr, description: input.descriptionFr, steps: serializeRecipeSteps(input.stepsFr, recipeStepDetailsForLocale(input, "fr"), "fr") },
      update: { title: input.titleFr, description: input.descriptionFr, steps: serializeRecipeSteps(input.stepsFr, recipeStepDetailsForLocale(input, "fr"), "fr") },
    });
    await transaction.recipeTranslation.upsert({
      where: { recipeId_locale: { recipeId: id, locale: "en" } },
      create: { recipeId: id, locale: "en", title: input.titleEn, description: input.descriptionEn, steps: serializeRecipeSteps(input.stepsEn, recipeStepDetailsForLocale(input, "en"), "en") },
      update: { title: input.titleEn, description: input.descriptionEn, steps: serializeRecipeSteps(input.stepsEn, recipeStepDetailsForLocale(input, "en"), "en") },
    });
    await transaction.recipeIngredient.deleteMany({ where: { recipeId: id } });
    await transaction.recipeIngredient.createMany({
      data: input.ingredients.map((ingredient) => ({
        recipeId: id,
        productId: ingredient.productId,
        variantId: ingredient.variantId || null,
        quantityPerBase: ingredient.quantityPerBase,
        unit: ingredient.unit,
        role: ingredient.role,
        optional: ingredient.optional,
        alternatives: serializeRecipeAlternativeIds(ingredient.alternativeProductIds),
        note: ingredient.note || null,
      })),
    });
    await transaction.auditLog.create({
      data: {
        action: "recipe_update",
        entityType: "Recipe",
        entityId: id,
        before: JSON.stringify({ country: before.country, category: before.category, status: before.status, baseServings: before.baseServings, translations: before.translations, ingredientCount: before.ingredients.length }),
        after: JSON.stringify({ titleFr: input.titleFr, titleEn: input.titleEn, country: input.country, category: input.category, status: input.status, baseServings: input.baseServings, ingredientCount: input.ingredients.length, alternativeCount: input.ingredients.reduce((count, ingredient) => count + ingredient.alternativeProductIds.length, 0), stepCount: input.stepsFr.length }),
        reason: `Modification complète par ${adminEmail}`,
      },
    });
    return updated;
  });

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
