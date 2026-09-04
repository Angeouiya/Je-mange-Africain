import { describe, expect, it } from "vitest";
import { productEditorialHighlight, recipeEditorialHighlight } from "./editorial-flags";

describe("editorial highlights", () => {
  it("gives product cards one clear commercial message", () => {
    expect(productEditorialHighlight({ isBestseller: true, isRecommended: true, isNew: true })).toBe("bestseller");
    expect(productEditorialHighlight({ isRecommended: true, isNew: true })).toBe("recommended");
    expect(productEditorialHighlight({ isNew: true })).toBe("new");
    expect(productEditorialHighlight({})).toBeNull();
  });

  it("gives recipe cards one clear editorial message", () => {
    expect(recipeEditorialHighlight({ isPopular: true, isRecommended: true, isNew: true })).toBe("popular");
    expect(recipeEditorialHighlight({ isRecommended: true, isNew: true })).toBe("recommended");
    expect(recipeEditorialHighlight({ isNew: true })).toBe("new");
    expect(recipeEditorialHighlight({})).toBeNull();
  });
});
