import { describe, expect, it } from "vitest";
import { computeRecipe, formatQty } from "@/lib/recipe-engine";

const ingredient = {
  ri: { id: "rice-line", quantityPerBase: 500, unit: "g", role: "base", optional: false, alternatives: null, note: null },
  product: {
    id: "rice",
    traditionalName: "Riz parfumé",
    imageEmoji: "",
    imageUrl: "/products/rice.webp",
    imageColor: "",
    thermalClass: "AMBIANT",
    stockQty: 20,
    reservedQty: 2,
    categoryId: "staples",
    categorySlug: "feculents",
    translations: [{ locale: "fr", name: "Riz parfumé" }, { locale: "en", name: "Fragrant rice" }],
  },
  variants: [{ id: "rice-500", label: "500 g", weightGrams: 500, volumeMl: 0, price: 4, isDefault: true }],
};

const egusi = {
  id: "egusi",
  traditionalName: "Egusi",
  imageEmoji: "",
  imageUrl: "/products/egousi.webp",
  imageColor: "",
  thermalClass: "AMBIANT",
  stockQty: 12,
  reservedQty: 0,
  categoryId: "staples",
  categorySlug: "feculents",
  translations: [{ locale: "fr", name: "Égousi" }, { locale: "en", name: "Egusi seeds" }],
  variants: [{ id: "egusi-300", label: "300 g", weightGrams: 300, volumeMl: 0, price: 6.2, isDefault: true }],
};

const context = {
  recipeId: "riz-sauce",
  baseServings: 4,
  steps: { fr: ["Rincer le riz parfumé.", "Cuire le riz parfumé."], en: ["Rinse the fragrant rice.", "Cook the fragrant rice."] },
  rawIngredients: [ingredient],
  allProductsForSubstitute: [{ ...ingredient.product, variants: ingredient.variants }, egusi],
};

describe("computeRecipe", () => {
  it("recalculates packs, total and leftovers for the household size", () => {
    const result = computeRecipe({
      servings: 8,
      adults: 8,
      children: 0,
      portion: "normal",
      kplo: false,
      spiceLevel: "medium",
      formula: "standard",
      haveAtHome: [],
    }, context);

    expect(result.ingredients[0]).toMatchObject({ neededQty: 1000, packs: 2, boughtQty: 1000, leftover: 0, lineTotal: 8 });
    expect(result.totalCost).toBe(8);
    expect(result.costPerPerson).toBe(1);
  });

  it("removes an unwanted ingredient from the generated basket", () => {
    const result = computeRecipe({
      servings: 4,
      adults: 4,
      children: 0,
      portion: "normal",
      kplo: false,
      spiceLevel: "medium",
      formula: "standard",
      haveAtHome: [],
      excludedIngredients: ["rice-line"],
    }, context);
    expect(result.ingredients[0]).toMatchObject({ removed: true, removalReason: "excluded", packs: 0, lineTotal: 0 });
    expect(result.totalCost).toBe(0);
    expect(result.steps).toEqual({ fr: [], en: [] });
  });

  it("rewrites preparation steps when an ingredient is replaced", () => {
    const result = computeRecipe({
      servings: 4,
      adults: 4,
      children: 0,
      portion: "normal",
      kplo: false,
      spiceLevel: "medium",
      formula: "standard",
      haveAtHome: [],
      replacements: { "rice-line": "egusi" },
    }, context);

    expect(result.ingredients[0]).toMatchObject({ productId: "egusi", isReplacement: true, originalNameFr: "Riz parfumé", nameFr: "Égousi" });
    expect(result.steps.fr).toEqual(["Rincer l’égousi.", "Cuire l’égousi."]);
    expect(result.steps.en).toEqual(["Rinse the egusi seeds.", "Cook the egusi seeds."]);
  });
});

describe("formatQty", () => {
  it("localizes pieces and converts large gram quantities", () => {
    expect(formatQty(2, "piece", "fr")).toBe("2 pièces");
    expect(formatQty(1500, "g", "en")).toBe("1,5 kg");
  });
});
