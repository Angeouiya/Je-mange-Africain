import { describe, expect, it } from "vitest";
import { inventoryPosition, retailAvailableUnits } from "./inventory";

describe("inventory availability", () => {
  it("exposes only units not already reserved", () => {
    expect(retailAvailableUnits(12, 5)).toBe(7);
    expect(retailAvailableUnits(3, 3)).toBe(0);
    expect(retailAvailableUnits(3, 8)).toBe(0);
  });

  it("normalises invalid and negative inventory values", () => {
    expect(inventoryPosition(-4, -2)).toEqual({ onHandQty: 0, reservedQty: 0, availableQty: 0 });
    expect(inventoryPosition(8.9, 2.8)).toEqual({ onHandQty: 8, reservedQty: 2, availableQty: 6 });
    expect(inventoryPosition(3, 8)).toEqual({ onHandQty: 3, reservedQty: 8, availableQty: 0 });
  });
});
