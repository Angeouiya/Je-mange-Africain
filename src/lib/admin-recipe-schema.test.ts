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

  it("validates the professional cues attached to every step", () => {
    const detail = {
      durationMinutes: "12",
      restMinutes: "5",
      heat: "medium",
      temperatureC: "95",
      equipmentFr: "Cocotte",
      equipmentEn: "Heavy pot",
      cueFr: "La sauce nappe nettement la cuillère.",
      cueEn: "The sauce clearly coats the spoon.",
      tipFr: "Remuer depuis le fond.",
      tipEn: "Stir from the bottom.",
      warningFr: "Attention à la vapeur.",
      warningEn: "Watch out for steam.",
      titleFr: "Lier la sauce",
      titleEn: "Bind the sauce",
      whyFr: "La cuisson douce concentre les aromates sans brûler la base.",
      whyEn: "Gentle cooking concentrates the aromatics without scorching the base.",
      recoveryFr: "Ajouter une cuillère d'eau chaude si la sauce épaissit trop.",
      recoveryEn: "Add one spoonful of hot water if the sauce becomes too thick.",
      ingredientProductIds: ["product-1"],
    };
    const result = recipeAdminInput.parse({ ...validRecipe, stepDetails: [detail, detail] });

    expect(result.stepDetails[0]).toMatchObject({ durationMinutes: 12, restMinutes: 5, temperatureC: 95 });
    expect(recipeAdminInput.safeParse({ ...validRecipe, stepDetails: [detail] }).success).toBe(false);
    expect(recipeAdminInput.safeParse({ ...validRecipe, stepDetails: [{ ...detail, ingredientProductIds: ["unknown-product"] }, detail] }).success).toBe(false);
  });

  it("creates a stable URL slug from an accented French title", () => {
    expect(recipeSlug("Kédjénou de poulet à l'ivoirienne")).toBe("kedjenou-de-poulet-a-l-ivoirienne");
  });
});
