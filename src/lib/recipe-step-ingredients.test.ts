import { describe, expect, it } from "vitest";
import { ingredientsForPreparationStep } from "./recipe-step-ingredients";

const ingredients = [
  { recipeIngredientId: "attieke", nameFr: "Attiéké frais", nameEn: "Fresh attieke", removalReason: null },
  { recipeIngredientId: "fish", nameFr: "Poisson capitaine", nameEn: "Captain fish", removalReason: null },
  { recipeIngredientId: "chili", nameFr: "Piment frais", nameEn: "Fresh chili", removalReason: "excluded" },
];

describe("recipe step ingredient references", () => {
  it("matches accented ingredient names in a French cooking instruction", () => {
    expect(ingredientsForPreparationStep("Réchauffer l'attiéké puis ajouter le poisson.", ingredients, "fr").map((item) => item.recipeIngredientId)).toEqual(["attieke", "fish"]);
  });

  it("uses the active language and omits deliberately excluded ingredients", () => {
    expect(ingredientsForPreparationStep("Season the fish with fresh chili.", ingredients, "en").map((item) => item.recipeIngredientId)).toEqual(["fish"]);
  });

  it("keeps pantry ingredients because they are still required for cooking", () => {
    const pantry = [{ recipeIngredientId: "oil", nameFr: "Huile de palme", removalReason: "pantry" }];
    expect(ingredientsForPreparationStep("Chauffer l'huile de palme.", pantry, "fr")).toHaveLength(1);
  });
});
