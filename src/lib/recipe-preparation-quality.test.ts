import { describe, expect, it } from "vitest";
import {
  PUBLISHED_RECIPE_MIN_STEPS,
  assessRecipePreparationQuality,
  recipePreparationPublicationConflict,
} from "./recipe-preparation-quality";

const detailedFrenchStep = "Cuire doucement la sauce pendant douze minutes en remuant depuis le fond, jusqu'à obtenir une texture brillante qui nappe la cuillère.";
const detailedEnglishStep = "Cook the sauce gently for twelve minutes, stirring from the bottom, until it becomes glossy and clearly coats the spoon.";
const completeDetail = {
  titleFr: "Maîtriser la cuisson",
  titleEn: "Control the cooking",
  durationMinutes: 12,
  heat: "low",
  equipmentFr: "Cocotte et cuillère en bois",
  equipmentEn: "Heavy pot and wooden spoon",
  cueFr: "La sauce est brillante et nappe la cuillère.",
  cueEn: "The sauce is glossy and coats the spoon.",
  tipFr: "Remuer régulièrement depuis le fond de la cocotte.",
  tipEn: "Stir regularly from the bottom of the pot.",
  whyFr: "La cuisson douce concentre les saveurs sans brûler la base.",
  whyEn: "Gentle cooking concentrates flavour without scorching the base.",
  recoveryFr: "Ajouter une cuillère d'eau chaude si la sauce épaissit trop.",
  recoveryEn: "Add one spoonful of hot water if the sauce becomes too thick.",
  ingredientProductIds: ["product-required"],
};

describe("recipe preparation publication quality", () => {
  it("accepts a complete bilingual and stock-linked cooking method", () => {
    const quality = assessRecipePreparationQuality({
      stepsFr: Array(PUBLISHED_RECIPE_MIN_STEPS).fill(detailedFrenchStep),
      stepsEn: Array(PUBLISHED_RECIPE_MIN_STEPS).fill(detailedEnglishStep),
      stepDetails: Array.from({ length: PUBLISHED_RECIPE_MIN_STEPS }, () => ({ ...completeDetail })),
      ingredients: [{ productId: "product-required", optional: false }],
    });

    expect(quality.ready).toBe(true);
    expect(quality.score).toBe(100);
    expect(quality.unlinkedRequiredProductIds).toEqual([]);
  });

  it("reports brief steps, incomplete guidance and ingredients absent from the method", () => {
    const quality = assessRecipePreparationQuality({
      stepsFr: ["Cuire la sauce."],
      stepsEn: ["Cook the sauce."],
      stepDetails: [{ ...completeDetail, tipEn: "", ingredientProductIds: [] }],
      ingredients: [{ productId: "product-required", optional: false }],
    });

    expect(quality.ready).toBe(false);
    expect(quality.score).toBe(0);
    expect(quality.shortFrenchStepIndexes).toEqual([0]);
    expect(quality.shortEnglishStepIndexes).toEqual([0]);
    expect(quality.incompleteGuidanceStepIndexes).toEqual([0]);
    expect(quality.unlinkedRequiredProductIds).toEqual(["product-required"]);
    expect(recipePreparationPublicationConflict(quality).error).toContain("Publication impossible");
  });

  it("does not require optional products to be assigned to a cooking step", () => {
    const quality = assessRecipePreparationQuality({
      stepsFr: Array(PUBLISHED_RECIPE_MIN_STEPS).fill(detailedFrenchStep),
      stepsEn: Array(PUBLISHED_RECIPE_MIN_STEPS).fill(detailedEnglishStep),
      stepDetails: Array.from({ length: PUBLISHED_RECIPE_MIN_STEPS }, () => ({ ...completeDetail })),
      ingredients: [
        { productId: "product-required", optional: false },
        { productId: "product-optional", optional: true },
      ],
    });

    expect(quality.requirements.ingredientCoverage).toBe(true);
  });
});
