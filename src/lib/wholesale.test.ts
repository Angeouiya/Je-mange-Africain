import { describe, expect, it } from "vitest";
import { nextWholesaleTier, wholesaleAvailablePacks, wholesaleDiscountPercent, wholesaleLineEconomics, wholesalePriceForQuantity, wholesaleTiers } from "./wholesale";

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

  it("summarises the selected line total and savings", () => {
    expect(wholesaleLineEconomics(6, 6, tiers, 5)).toEqual({
      casePrice: 30,
      lineTotal: 150,
      retailEquivalent: 180,
      savings: 30,
      savingsPercent: 17,
    });
  });

  it("identifies the next price tier without mutating the tier list", () => {
    const unsorted = [tiers[2], tiers[0], tiers[1]];
    expect(nextWholesaleTier(unsorted, 5)).toEqual({ minPacks: 10, price: 28, remainingPacks: 5 });
    expect(nextWholesaleTier(unsorted, 10)).toBeNull();
    expect(unsorted.map((tier) => tier.minPacks)).toEqual([10, 1, 5]);
  });
});
