import { z } from "zod";
import { normalize } from "@/lib/format";
import type { RecipeStepDetails } from "@/lib/recipe-step-guide";

export const recipeImageReference = z.string().trim().max(1000).refine((value) => (
  z.string().url().safeParse(value).success
  || /^\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_.-]+\.(?:avif|webp|png|jpe?g)$/i.test(value)
), "La photo doit être une URL publique ou une ressource image de la plateforme.");

export const recipeIngredientAdminInput = z.object({
  productId: z.string().trim().min(1),
  variantId: z.string().trim().min(1).nullable().optional(),
  quantityPerBase: z.coerce.number().positive().max(100000),
  unit: z.enum(["g", "kg", "ml", "L", "piece", "tbsp", "tsp"]),
  role: z.enum(["protein", "base", "aromatic", "spice", "fat", "side", "optional"]),
  optional: z.boolean().default(false),
  alternativeProductIds: z.array(z.string().trim().min(1)).max(8).default([]),
  note: z.string().trim().max(240).nullable().optional(),
}).superRefine((ingredient, context) => {
  if (new Set(ingredient.alternativeProductIds).size !== ingredient.alternativeProductIds.length) {
    context.addIssue({ code: "custom", path: ["alternativeProductIds"], message: "Une alternative ne peut apparaître qu'une fois." });
  }
  if (ingredient.alternativeProductIds.includes(ingredient.productId)) {
    context.addIssue({ code: "custom", path: ["alternativeProductIds"], message: "Le produit principal ne peut pas être sa propre alternative." });
  }
});

const optionalInteger = (minimum: number, maximum: number) => z.preprocess(
  (value) => value === "" || value === null || value === undefined ? null : value,
  z.coerce.number().int().min(minimum).max(maximum).nullable(),
);

const optionalStepText = z.string().trim().max(500).nullable().optional();

export const recipeStepDetailsAdminInput = z.object({
  durationMinutes: z.coerce.number().int().min(1).max(240),
  restMinutes: z.coerce.number().int().min(0).max(720).default(0),
  heat: z.enum(["none", "low", "medium", "high", "oven"]),
  temperatureC: optionalInteger(30, 300),
  equipmentFr: z.string().trim().max(160).nullable().optional(),
  equipmentEn: z.string().trim().max(160).nullable().optional(),
  cueFr: z.string().trim().min(10).max(500),
  cueEn: z.string().trim().min(10).max(500),
  tipFr: optionalStepText,
  tipEn: optionalStepText,
  warningFr: optionalStepText,
  warningEn: optionalStepText,
});

export const recipeAdminInput = z.object({
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
  imageUrl: recipeImageReference,
  imageColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  isPopular: z.boolean().default(false),
  isNew: z.boolean().default(false),
  isRecommended: z.boolean().default(false),
  status: z.enum(["draft", "published", "archived"]),
  stepsFr: z.array(z.string().trim().min(5).max(800)).min(2).max(30),
  stepsEn: z.array(z.string().trim().min(5).max(800)).min(2).max(30),
  stepDetails: z.array(recipeStepDetailsAdminInput).max(30).optional().default([]),
  ingredients: z.array(recipeIngredientAdminInput).min(1).max(60),
}).superRefine((input, context) => {
  if (input.stepsFr.length !== input.stepsEn.length) {
    context.addIssue({ code: "custom", path: ["stepsEn"], message: "Chaque étape française doit posséder sa version anglaise." });
  }
  if (input.stepDetails.length > 0 && input.stepDetails.length !== input.stepsFr.length) {
    context.addIssue({ code: "custom", path: ["stepDetails"], message: "Chaque étape doit posséder ses repères de cuisson." });
  }
});

export type RecipeAdminInput = z.infer<typeof recipeAdminInput>;

export function recipeStepDetailsForLocale(input: RecipeAdminInput, locale: "fr" | "en"): RecipeStepDetails[] {
  return input.stepDetails.map((detail) => ({
    durationMinutes: detail.durationMinutes,
    restMinutes: detail.restMinutes,
    heat: detail.heat,
    temperatureC: detail.temperatureC,
    equipment: locale === "fr" ? detail.equipmentFr : detail.equipmentEn,
    cue: locale === "fr" ? detail.cueFr : detail.cueEn,
    tip: locale === "fr" ? detail.tipFr : detail.tipEn,
    warning: locale === "fr" ? detail.warningFr : detail.warningEn,
  }));
}

export const recipeSlug = (title: string) => normalize(title)
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "")
  .slice(0, 80);
