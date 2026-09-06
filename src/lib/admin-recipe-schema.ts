import { z } from "zod";
import { normalize } from "@/lib/format";
import type { RecipeStepDetails } from "@/lib/recipe-step-guide";
import { assessRecipePreparationQuality } from "@/lib/recipe-preparation-quality";

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
const optionalStepTitle = z.string().trim().max(100).nullable().optional();

export const recipeStepDetailsAdminInput = z.object({
  titleFr: optionalStepTitle,
  titleEn: optionalStepTitle,
  durationMinutes: optionalInteger(1, 240),
  restMinutes: optionalInteger(0, 720).default(0),
  heat: z.enum(["none", "low", "medium", "high", "oven"]).default("none"),
  temperatureC: optionalInteger(30, 300),
  equipmentFr: z.string().trim().max(160).nullable().optional(),
  equipmentEn: z.string().trim().max(160).nullable().optional(),
  cueFr: optionalStepText,
  cueEn: optionalStepText,
  tipFr: optionalStepText,
  tipEn: optionalStepText,
  warningFr: optionalStepText,
  warningEn: optionalStepText,
  whyFr: optionalStepText,
  whyEn: optionalStepText,
  recoveryFr: optionalStepText,
  recoveryEn: optionalStepText,
  ingredientProductIds: z.array(z.string().trim().min(1)).max(60).default([]),
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
  const recipeProductIds = new Set(input.ingredients.map((ingredient) => ingredient.productId));
  input.stepDetails.forEach((detail, index) => {
    if (new Set(detail.ingredientProductIds).size !== detail.ingredientProductIds.length) {
      context.addIssue({ code: "custom", path: ["stepDetails", index, "ingredientProductIds"], message: "Un ingrédient ne peut être lié qu’une fois à la même étape." });
    }
    if (detail.ingredientProductIds.some((productId) => !recipeProductIds.has(productId))) {
      context.addIssue({ code: "custom", path: ["stepDetails", index, "ingredientProductIds"], message: "Chaque ingrédient d’étape doit appartenir à la recette." });
    }
  });
  if (input.status !== "published") return;

  const preparationQuality = assessRecipePreparationQuality(input);
  if (!preparationQuality.requirements.completeSequence) {
    context.addIssue({ code: "custom", path: ["stepsFr"], message: "Une recette publiée doit comporter au moins cinq étapes parfaitement alignées en français et en anglais." });
  }
  if (!preparationQuality.requirements.detailedBilingualInstructions) {
    context.addIssue({ code: "custom", path: ["stepsFr"], message: "Chaque étape publiée doit détailler le geste en français et en anglais avec au moins seize mots." });
  }
  if (!preparationQuality.requirements.professionalGuidance) {
    context.addIssue({ code: "custom", path: ["stepDetails"], message: "Chaque étape publiée doit préciser le temps, la chaleur, le matériel, le résultat, le conseil, la raison et le rattrapage dans les deux langues." });
  }
  if (!preparationQuality.requirements.ingredientCoverage) {
    context.addIssue({ code: "custom", path: ["stepDetails"], message: "Chaque ingrédient obligatoire doit être relié à au moins une étape de préparation." });
  }
});

export type RecipeAdminInput = z.infer<typeof recipeAdminInput>;

export function recipeStepDetailsForLocale(input: RecipeAdminInput, locale: "fr" | "en"): RecipeStepDetails[] {
  return input.stepDetails.map((detail) => ({
    title: locale === "fr" ? detail.titleFr : detail.titleEn,
    durationMinutes: detail.durationMinutes,
    restMinutes: detail.restMinutes,
    heat: detail.heat,
    temperatureC: detail.temperatureC,
    equipment: locale === "fr" ? detail.equipmentFr : detail.equipmentEn,
    cue: locale === "fr" ? detail.cueFr : detail.cueEn,
    tip: locale === "fr" ? detail.tipFr : detail.tipEn,
    warning: locale === "fr" ? detail.warningFr : detail.warningEn,
    why: locale === "fr" ? detail.whyFr : detail.whyEn,
    recovery: locale === "fr" ? detail.recoveryFr : detail.recoveryEn,
    ingredientProductIds: detail.ingredientProductIds,
  }));
}

export const recipeSlug = (title: string) => normalize(title)
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "")
  .slice(0, 80);
