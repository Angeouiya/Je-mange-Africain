import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getProductPhoto, getRecipePhoto } from "@/lib/market-media";
import { parseRecipeSteps, publicStepDetails } from "@/lib/recipe-step-storage";
import { retailAvailableUnits } from "@/lib/inventory";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const locale = (searchParams.get("locale") as "fr" | "en") || "fr";

  const recipe = await db.recipe.findFirst({
    where: { id, status: "published" },
    include: {
      translations: true,
      ingredients: {
        include: {
          product: {
            include: {
              translations: true,
              variants: true,
              category: true,
            },
          },
        },
      },
    },
  });
  if (!recipe) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const t = recipe.translations.find((x) => x.locale === locale) || recipe.translations[0];
  const steps = parseRecipeSteps(t?.steps, locale);

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
    imageUrl: getRecipePhoto({ slug: recipe.slug, title: t?.title, country: recipe.country, category: recipe.category, imageUrl: recipe.imageUrl }),
    galleryUrls: (() => { try { return recipe.galleryUrls ? JSON.parse(recipe.galleryUrls) : []; } catch { return []; } })(),
    isPopular: recipe.isPopular,
    isNew: recipe.isNew,
    isRecommended: recipe.isRecommended,
    title: t?.title,
    description: t?.description,
    steps: steps.map((step) => step.instruction),
    stepDetails: publicStepDetails(steps),
    ingredients: recipe.ingredients.map((ri) => ({
      recipeIngredientId: ri.id,
      productId: ri.productId,
      variantId: ri.variantId,
      quantityPerBase: ri.quantityPerBase,
      unit: ri.unit,
      role: ri.role,
      optional: ri.optional,
      alternatives: ri.alternatives,
      note: ri.note,
      product: {
        id: ri.product.id,
        traditionalName: ri.product.traditionalName,
        emoji: ri.product.imageEmoji,
        imageUrl: getProductPhoto({
          traditionalName: ri.product.traditionalName,
          imageUrl: ri.product.imageUrl,
          category: ri.product.category,
        }),
        color: ri.product.imageColor,
        thermalClass: ri.product.thermalClass,
        stockQty: retailAvailableUnits(ri.product.stockQty, ri.product.reservedQty),
        categoryId: ri.product.categoryId,
        nameFr: ri.product.translations.find((t) => t.locale === "fr")?.name || ri.product.traditionalName,
        nameEn: ri.product.translations.find((t) => t.locale === "en")?.name || ri.product.traditionalName,
        variants: ri.product.variants.map((v) => ({ id: v.id, label: v.label, weightGrams: v.weightGrams, volumeMl: v.volumeMl, price: Number(v.price), isDefault: v.isDefault })),
      },
    })),
  });
}
