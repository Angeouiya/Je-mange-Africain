import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { normalize } from "@/lib/format";

export const dynamic = "force-dynamic";

const IngredientInput = z.object({
  productId: z.string().trim().min(1),
  variantId: z.string().trim().min(1).nullable().optional(),
  quantityPerBase: z.coerce.number().positive().max(100000),
  unit: z.enum(["g", "kg", "ml", "L", "piece", "tbsp", "tsp"]),
  role: z.enum(["protein", "base", "aromatic", "spice", "fat", "side", "optional"]),
  optional: z.boolean().default(false),
  note: z.string().trim().max(240).nullable().optional(),
});

const RecipeInput = z.object({
  titleFr: z.string().trim().min(2).max(120),
  titleEn: z.string().trim().min(2).max(120),
  descriptionFr: z.string().trim().min(20).max(1200),
  descriptionEn: z.string().trim().min(20).max(1200),
  country: z.string().trim().min(2).max(80),
  category: z.enum(["sauces", "mains", "sides", "grill", "drinks", "desserts", "porridge", "family", "events"]),
  difficulty: z.enum(["easy", "medium", "hard"]),
  timeMinutes: z.coerce.number().int().min(5).max(720),
  baseServings: z.coerce.number().int().min(1).max(50),
  imageEmoji: z.string().trim().min(1).max(12),
  imageUrl: z.string().url().max(1000),
  imageColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  isPopular: z.boolean().default(false),
  isNew: z.boolean().default(false),
  isRecommended: z.boolean().default(false),
  status: z.enum(["draft", "published"]),
  stepsFr: z.array(z.string().trim().min(5).max(500)).min(2).max(30),
  stepsEn: z.array(z.string().trim().min(5).max(500)).min(2).max(30),
  ingredients: z.array(IngredientInput).min(1).max(60),
}).superRefine((input, context) => {
  if (input.stepsFr.length !== input.stepsEn.length) {
    context.addIssue({ code: "custom", path: ["stepsEn"], message: "Chaque étape française doit posséder sa version anglaise." });
  }
});

const recipeSlug = (title: string) => normalize(title)
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "")
  .slice(0, 80);

export async function GET(request: NextRequest) {
  const authorization = await authorizeAdminRequest(request, { module: "recipes", action: "read" });
  if (!authorization.ok) return authorization.response;

  const locale = new URL(request.url).searchParams.get("locale") === "en" ? "en" : "fr";
  const recipes = await db.recipe.findMany({
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    include: { translations: true, ingredients: true },
  });

  return NextResponse.json({
    recipes: recipes.map((recipe) => ({
      id: recipe.id,
      slug: recipe.slug,
      country: recipe.country,
      category: recipe.category,
      difficulty: recipe.difficulty,
      timeMinutes: recipe.timeMinutes,
      baseServings: recipe.baseServings,
      imageColor: recipe.imageColor,
      imageEmoji: recipe.imageEmoji,
      imageUrl: recipe.imageUrl,
      galleryUrls: (() => { try { return recipe.galleryUrls ? JSON.parse(recipe.galleryUrls) : []; } catch { return []; } })(),
      isPopular: recipe.isPopular,
      isNew: recipe.isNew,
      isRecommended: recipe.isRecommended,
      status: recipe.status,
      ingredientCount: recipe.ingredients.length,
      title: recipe.translations.find((translation) => translation.locale === locale)?.title || recipe.translations[0]?.title,
      description: recipe.translations.find((translation) => translation.locale === locale)?.description || recipe.translations[0]?.description,
    })),
  });
}

export async function POST(request: NextRequest) {
  const authorization = await authorizeAdminRequest(request, { module: "recipes", action: "create" });
  if (!authorization.ok) return authorization.response;

  const parsed = RecipeInput.safeParse(await request.json().catch(() => null));
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
        imageColor: input.imageColor,
        imageEmoji: input.imageEmoji,
        imageUrl: input.imageUrl,
        isPopular: input.isPopular,
        isNew: input.isNew,
        isRecommended: input.isRecommended,
        status: input.status,
        translations: {
          create: [
            { locale: "fr", title: input.titleFr, description: input.descriptionFr, steps: JSON.stringify(input.stepsFr) },
            { locale: "en", title: input.titleEn, description: input.descriptionEn, steps: JSON.stringify(input.stepsEn) },
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
