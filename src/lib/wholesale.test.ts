import { describe, expect, it } from "vitest";
import { wholesaleAvailablePacks, wholesaleDiscountPercent, wholesalePriceForQuantity, wholesaleTiers } from "./wholesale";

describe("wholesale pricing", () => {
  const tiers = wholesaleTiers({
    wholesaleMinPacks: 1,
    wholesalePrice: 32,
    wholesaleTier2MinPacks: 5,
    wholesaleTier2Price: 30,
    wholesaleTier3MinPacks: 10,
    wholesaleTier3Price: 28,
  });

  it("applies the best eligible case price", () => {
    expect(wholesalePriceForQuantity(tiers, 1)).toBe(32);
    expect(wholesalePriceForQuantity(tiers, 7)).toBe(30);
    expect(wholesalePriceForQuantity(tiers, 12)).toBe(28);
  });

  it("converts live unit stock into complete cases", () => {
    expect(wholesaleAvailablePacks(80, 8, 6)).toBe(12);
    expect(wholesaleAvailablePacks(5, 0, 6)).toBe(0);
  });

  it("compares a wholesale case with its retail equivalent", () => {
    expect(wholesaleDiscountPercent(6, 6, 32)).toBe(11);
    expect(wholesaleDiscountPercent(5, 6, 30)).toBe(0);
  });
});
