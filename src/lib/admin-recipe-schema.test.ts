import { describe, expect, it } from "vitest";
import { recipeAdminInput, recipeSlug } from "./admin-recipe-schema";

const validRecipe = {
  titleFr: "Attiéké au poisson braisé",
  titleEn: "Attieke with grilled fish",
  descriptionFr: "Un grand classique ivoirien servi avec une garniture fraîche et relevée.",
  descriptionEn: "An Ivorian classic served with a fresh and gently spiced garnish.",
  country: "Côte d'Ivoire",
  category: "mains",
  difficulty: "medium",
  timeMinutes: "55",
  baseServings: "4",
  imageEmoji: "🍲",
  imageUrl: "https://cdn.je-mange-africain.com/recipes/attieke-poisson.webp",
  imageColor: "#D65A32",
  isPopular: true,
  isNew: false,
  isRecommended: true,
  status: "published",
  stepsFr: ["Assaisonner soigneusement le poisson.", "Braiser puis servir avec l'attiéké."],
  stepsEn: ["Season the fish thoroughly.", "Grill and serve with the attieke."],
  ingredients: [{ productId: "product-1", quantityPerBase: "500", unit: "g", role: "base", optional: false }],
};

describe("admin recipe contract", () => {
  it("coerces serving, duration and ingredient quantities", () => {
    const recipe = recipeAdminInput.parse(validRecipe);

    expect(recipe.timeMinutes).toBe(55);
    expect(recipe.baseServings).toBe(4);
    expect(recipe.ingredients[0].quantityPerBase).toBe(500);
  });

  it("keeps the bilingual preparation sequences aligned", () => {
    const result = recipeAdminInput.safeParse({ ...validRecipe, stepsEn: ["Season the fish thoroughly."] });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.flatten().fieldErrors.stepsEn).toBeDefined();
  });

  it("accepts an archived recipe for a complete administrative edit", () => {
    expect(recipeAdminInput.safeParse({ ...validRecipe, status: "archived" }).success).toBe(true);
  });

  it("accepts hosted recipe assets but rejects non-image internal paths", () => {
    expect(recipeAdminInput.safeParse({ ...validRecipe, imageUrl: "/recipes/attieke-poisson.webp" }).success).toBe(true);
    expect(recipeAdminInput.safeParse({ ...validRecipe, imageUrl: "/api/admin/recipes" }).success).toBe(false);
  });

  it("accepts detailed bilingual cooking instructions", () => {
    const detailedStep = "Cuire à feu doux pendant 20 minutes en remuant régulièrement, jusqu'à ce que la sauce soit brillante et nappe la cuillère.";
    const detailedStepEn = "Cook over low heat for 20 minutes, stirring regularly, until the sauce is glossy and coats a spoon.";

    expect(recipeAdminInput.safeParse({ ...validRecipe, stepsFr: [detailedStep, detailedStep], stepsEn: [detailedStepEn, detailedStepEn] }).success).toBe(true);
    expect(recipeAdminInput.safeParse({ ...validRecipe, stepsFr: ["a".repeat(801), detailedStep], stepsEn: [detailedStepEn, detailedStepEn] }).success).toBe(false);
  });

  it("creates a stable URL slug from an accented French title", () => {
    expect(recipeSlug("Kédjénou de poulet à l'ivoirienne")).toBe("kedjenou-de-poulet-a-l-ivoirienne");
  });
});
