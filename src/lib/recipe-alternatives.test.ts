import { describe, expect, it } from "vitest";
import { parseRecipeAlternativeIds, serializeRecipeAlternativeIds } from "./recipe-alternatives";

describe("recipe alternatives", () => {
  it("normalizes structured product identifiers without duplicates", () => {
    expect(parseRecipeAlternativeIds('["product-2","product-2"," product-3 ",null]')).toEqual(["product-2", "product-3"]);
  });

  it("rejects malformed persisted values", () => {
    expect(parseRecipeAlternativeIds("not-json")).toEqual([]);
    expect(parseRecipeAlternativeIds('{"product":"product-2"}')).toEqual([]);
  });

  it("stores an empty selection as null", () => {
    expect(serializeRecipeAlternativeIds([])).toBeNull();
    expect(serializeRecipeAlternativeIds(["product-2"])).toBe('["product-2"]');
  });
});
