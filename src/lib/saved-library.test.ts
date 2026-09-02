import { describe, expect, it } from "vitest";
import { normalizeSavedIds, reconcileSavedLibrary } from "./saved-library";

describe("saved library reconciliation", () => {
  it("merges anonymous choices into the account once", () => {
    expect(reconcileSavedLibrary({
      remote: { productIds: ["remote-product"], recipeIds: [] },
      local: { productIds: ["local-product"], recipeIds: ["local-recipe"] },
      ownedByCurrentCustomer: false,
      preservePendingChanges: false,
    })).toEqual({
      productIds: ["remote-product", "local-product"],
      recipeIds: ["local-recipe"],
      needsServerSync: true,
    });
  });

  it("uses the server as authority for an established account", () => {
    expect(reconcileSavedLibrary({
      remote: { productIds: ["kept"], recipeIds: ["remote-recipe"] },
      local: { productIds: ["kept", "removed-elsewhere"], recipeIds: [] },
      ownedByCurrentCustomer: true,
      preservePendingChanges: false,
    })).toEqual({
      productIds: ["kept"],
      recipeIds: ["remote-recipe"],
      needsServerSync: false,
    });
  });

  it("preserves a local update while an older account response arrives", () => {
    expect(reconcileSavedLibrary({
      remote: { productIds: ["old"], recipeIds: [] },
      local: { productIds: ["new"], recipeIds: ["pending-recipe"] },
      ownedByCurrentCustomer: true,
      preservePendingChanges: true,
    })).toEqual({
      productIds: ["new"],
      recipeIds: ["pending-recipe"],
      needsServerSync: true,
    });
  });

  it("deduplicates and caps identifiers", () => {
    const ids = Array.from({ length: 205 }, (_, index) => `item-${index}`);
    expect(normalizeSavedIds([ids[0], ids[0], ...ids])).toHaveLength(200);
    expect(normalizeSavedIds([ids[0], ids[0], ...ids])[0]).toBe(ids[0]);
  });
});
