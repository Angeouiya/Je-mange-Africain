import { describe, expect, it } from "vitest";
import { PUBLIC_RECIPE_WHERE, hasRequiredRecipeIngredient, recipePublicationConflict, unpublishedRecipeProductIds } from "./recipe-publication";

describe("recipe publication", () => {
  it("defines one public boundary for recipes and their linked products", () => {
    expect(PUBLIC_RECIPE_WHERE).toEqual({
      status: "published",
      ingredients: {
        some: { optional: false },
        none: { product: { status: { not: "published" } } },
      },
    });
  });

  it("returns draft, archived and missing primary products", () => {
    expect(unpublishedRecipeProductIds(
      ["published", "draft", "archived", "missing", "draft"],
      [
        { id: "published", status: "published" },
        { id: "draft", status: "draft" },
        { id: "archived", status: "archived" },
      ],
    )).toEqual(["draft", "archived", "missing"]);
  });

  it("builds an actionable conflict response for the admin", () => {
    expect(recipePublicationConflict(["draft-product"])).toMatchObject({
      error: expect.stringContaining("Publiez d'abord ce produit"),
      unpublishedProductIds: ["draft-product"],
    });
  });

  it("requires at least one non-optional ingredient before publication", () => {
    expect(hasRequiredRecipeIngredient([{ optional: true }, { optional: true }])).toBe(false);
    expect(hasRequiredRecipeIngredient([{ optional: true }, { optional: false }])).toBe(true);
    expect(recipePublicationConflict([], true).error).toContain("au moins un ingrédient obligatoire");
    expect(recipePublicationConflict([], true, "en").error).toContain("at least one required ingredient");
  });
});
