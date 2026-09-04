import { describe, expect, it } from "vitest";
import { kitchenResultCount, preferredSearchCollection } from "./search-experience";

describe("global search destinations", () => {
  it("keeps products as the primary destination when sellable matches exist", () => {
    expect(preferredSearchCollection({ products: 2, recipes: 3, dishes: 4 })).toBe("products");
  });

  it("routes a recipe-only query to configurable recipes", () => {
    expect(preferredSearchCollection({ products: 0, recipes: 2, dishes: 1 })).toBe("recipes");
  });

  it("routes a dish-only query to the culinary atlas", () => {
    expect(preferredSearchCollection({ products: 0, recipes: 0, dishes: 3 })).toBe("library");
  });

  it("uses the product catalogue as a useful fallback and combines kitchen counts", () => {
    expect(preferredSearchCollection({ products: 0, recipes: 0, dishes: 0 })).toBe("products");
    expect(kitchenResultCount({ products: 5, recipes: 2, dishes: 4 })).toBe(6);
  });
});

