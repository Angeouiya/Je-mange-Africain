import { z } from "zod";
import { normalize } from "@/lib/format";

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
  note: z.string().trim().max(240).nullable().optional(),
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
  stepsFr: z.array(z.string().trim().min(5).max(500)).min(2).max(30),
  stepsEn: z.array(z.string().trim().min(5).max(500)).min(2).max(30),
  ingredients: z.array(recipeIngredientAdminInput).min(1).max(60),
}).superRefine((input, context) => {
  if (input.stepsFr.length !== input.stepsEn.length) {
    context.addIssue({ code: "custom", path: ["stepsEn"], message: "Chaque étape française doit posséder sa version anglaise." });
  }
});

export type RecipeAdminInput = z.infer<typeof recipeAdminInput>;

export const recipeSlug = (title: string) => normalize(title)
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "")
  .slice(0, 80);
