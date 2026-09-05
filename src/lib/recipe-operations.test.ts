import { describe, expect, it } from "vitest";
import { recipeStepCount, recipeStockReadiness } from "./recipe-operations";

describe("recipe operations", () => {
  it("measures stock coverage from required ingredients only", () => {
    expect(recipeStockReadiness([
      { optional: false, product: { stockQty: 12, status: "published" } },
      { optional: false, product: { stockQty: 0, status: "published" } },
      { optional: true, product: { stockQty: 0, status: "published" } },
    ])).toEqual({
      requiredIngredientCount: 2,
      availableIngredientCount: 1,
      unpublishedIngredientCount: 0,
      stockCoverageRate: 50,
      needsAttention: true,
    });
  });

  it("does not count archived products as available", () => {
    expect(recipeStockReadiness([{ product: { stockQty: 8, status: "archived" } }])).toMatchObject({
      availableIngredientCount: 0,
      needsAttention: true,
    });
  });

  it("flags optional products that are not ready for storefront publication", () => {
    expect(recipeStockReadiness([
      { productId: "base", product: { id: "base", stockQty: 8, status: "published" } },
      { productId: "garnish", optional: true, product: { id: "garnish", stockQty: 8, status: "draft" } },
    ])).toMatchObject({
      availableIngredientCount: 1,
      unpublishedIngredientCount: 1,
      stockCoverageRate: 100,
      needsAttention: true,
    });
  });

  it("does not count stock already reserved by customer orders", () => {
    expect(recipeStockReadiness([{ product: { stockQty: 6, reservedQty: 6, status: "published" } }])).toMatchObject({
      availableIngredientCount: 0,
      needsAttention: true,
    });
  });

  it("counts valid preparation steps defensively", () => {
    expect(recipeStepCount('["Préparer", "Cuire", ""]')).toBe(2);
    expect(recipeStepCount('[{"version":1,"instruction":"Préparer avec soin"},{"instruction":""}]')).toBe(1);
    expect(recipeStepCount("not-json")).toBe(0);
  });
});
