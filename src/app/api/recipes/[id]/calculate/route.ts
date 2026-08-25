import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { computeRecipe, type RecipeConfigInput } from "@/lib/recipe-engine";
import { getProductPhoto } from "@/lib/market-media";

export const dynamic = "force-dynamic";

const RecipeConfiguration = z.object({
  servings: z.number().int().min(1).max(24),
  adults: z.number().int().min(0).max(24),
  children: z.number().int().min(0).max(24),
  portion: z.enum(["normal", "generous"]),
  protein: z.enum(["recipe", "meat", "fish", "none"]).default("recipe"),
  kplo: z.boolean(),
  spiceLevel: z.enum(["mild", "medium", "hot", "veryHot"]),
  allergies: z.string().trim().max(500).optional().default(""),
  budget: z.number().positive().max(10000).optional(),
  formula: z.enum(["economy", "standard", "premium"]),
  haveAtHome: z.array(z.string().min(1)).max(100).default([]),
  excludedIngredients: z.array(z.string().min(1)).max(100).default([]),
  replacements: z.record(z.string(), z.string().min(1)).default({}),
}).refine((value) => value.adults + value.children >= 1 && value.adults + value.children <= 24, {
  message: "Le nombre total de personnes doit être compris entre 1 et 24.",
  path: ["servings"],
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payload = await req.json().catch(() => null);
  const parsed = RecipeConfiguration.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "Configuration de recette invalide." }, { status: 400 });
  const body = parsed.data as RecipeConfigInput;
  const url = new URL(req.url);
  const locale = (url.searchParams.get("locale") as "fr" | "en") || "fr";

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
  if (!recipe) return NextResponse.json({ error: "Recipe not found" }, { status: 404 });

  // All products available for substitution (same categories broadly)
  const allProducts = await db.product.findMany({
    where: { status: "published" },
    include: { translations: true, category: true, variants: true },
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
      imageUrl: getProductPhoto({
        traditionalName: ri.product.traditionalName,
        imageUrl: ri.product.imageUrl,
        category: ri.product.category,
      }),
      imageColor: ri.product.imageColor,
      thermalClass: ri.product.thermalClass,
      stockQty: ri.product.stockQty,
      reservedQty: ri.product.reservedQty,
      categoryId: ri.product.categoryId,
      categorySlug: ri.product.category.slug,
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
      id: p.id, traditionalName: p.traditionalName, imageEmoji: p.imageEmoji, imageUrl: getProductPhoto({ traditionalName: p.traditionalName, imageUrl: p.imageUrl, category: p.category }), imageColor: p.imageColor,
      stockQty: p.stockQty, reservedQty: p.reservedQty, thermalClass: p.thermalClass, categoryId: p.categoryId, categorySlug: p.category.slug,
      translations: p.translations.map((t) => ({ locale: t.locale, name: t.name })),
      variants: p.variants.map((v) => ({
        id: v.id, label: v.label, weightGrams: v.weightGrams, volumeMl: v.volumeMl, price: Number(v.price), isDefault: v.isDefault,
      })),
    })),
  });

  return NextResponse.json({ result, locale });
}
