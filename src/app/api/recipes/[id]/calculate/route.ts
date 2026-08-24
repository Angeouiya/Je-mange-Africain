import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { computeRecipe, type RecipeConfigInput } from "@/lib/recipe-engine";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json()) as RecipeConfigInput;
  const url = new URL(req.url);
  const locale = (url.searchParams.get("locale") as "fr" | "en") || "fr";

  const recipe = await db.recipe.findUnique({
    where: { id },
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
  if (!recipe) return NextResponse.json({ error: "Recipe not found" }, { status: 404 });

  // All products available for substitution (same categories broadly)
  const allProducts = await db.product.findMany({
    where: { status: "published" },
    include: { translations: true, category: true },
  });

  const rawIngredients = recipe.ingredients.map((ri) => ({
    ri: {
      id: ri.id,
      quantityPerBase: ri.quantityPerBase,
      unit: ri.unit,
      role: ri.role,
      optional: ri.optional,
      alternatives: ri.alternatives,
      note: ri.note,
    },
    product: {
      id: ri.product.id,
      traditionalName: ri.product.traditionalName,
      imageEmoji: ri.product.imageEmoji,
      imageColor: ri.product.imageColor,
      thermalClass: ri.product.thermalClass,
      stockQty: ri.product.stockQty,
      reservedQty: ri.product.reservedQty,
      categoryId: ri.product.categoryId,
      translations: ri.product.translations.map((t) => ({ locale: t.locale, name: t.name })),
    },
    variants: ri.product.variants.map((v) => ({
      id: v.id, label: v.label, weightGrams: v.weightGrams, volumeMl: v.volumeMl, price: Number(v.price), isDefault: v.isDefault,
    })),
  }));

  const steps = {
    fr: (() => { try { return JSON.parse(recipe.translations.find((t) => t.locale === "fr")?.steps || "[]"); } catch { return []; } })(),
    en: (() => { try { return JSON.parse(recipe.translations.find((t) => t.locale === "en")?.steps || "[]"); } catch { return []; } })(),
  };

  const result = computeRecipe(body, {
    recipeId: recipe.id,
    baseServings: recipe.baseServings,
    steps,
    rawIngredients,
    allProductsForSubstitute: allProducts.map((p) => ({
      id: p.id, traditionalName: p.traditionalName, stockQty: p.stockQty, thermalClass: p.thermalClass, categoryId: p.categoryId,
      translations: p.translations.map((t) => ({ locale: t.locale, name: t.name })),
    })),
  });

  return NextResponse.json({ result, locale });
}
