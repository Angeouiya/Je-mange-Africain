import { describe, expect, it } from "vitest";
import {
  inventoryBatchCreateInput,
  inventoryBatchMutationInput,
  isStockDateExpired,
  signedStockAdjustment,
  statusAvailabilityDelta,
} from "@/lib/admin-stock-schema";

describe("inventory batch validation", () => {
  it("normalizes a traceable stock receipt", () => {
    const result = inventoryBatchCreateInput.parse({
      productId: "product-1",
      warehouseId: "warehouse-1",
      lotNumber: " att-2609-fr ",
      quantity: "120",
      costPrice: "2.80",
      receiptDate: "2026-09-02",
      expiryDate: "2026-09-12",
      status: "active",
      reason: "Réception fournisseur Abidjan",
    });

    expect(result).toMatchObject({ lotNumber: "ATT-2609-FR", quantity: 120, costPrice: 2.8 });
  });

  it("rejects an expiry date before receipt", () => {
    const result = inventoryBatchCreateInput.safeParse({
      productId: "product-1",
      warehouseId: "warehouse-1",
      lotNumber: "ATT-2609-FR",
      quantity: 120,
      costPrice: 2.8,
      receiptDate: "2026-09-12",
      expiryDate: "2026-09-02",
      status: "active",
      reason: "Réception fournisseur Abidjan",
    });

    expect(result.success).toBe(false);
  });

  it("rejects impossible calendar dates", () => {
    const result = inventoryBatchCreateInput.safeParse({
      productId: "product-1",
      warehouseId: "warehouse-1",
      lotNumber: "ATT-2609-FR",
      quantity: 120,
      costPrice: 2.8,
      receiptDate: "2026-02-31",
      expiryDate: "2026-09-12",
      status: "active",
      reason: "Réception fournisseur Abidjan",
    });

    expect(result.success).toBe(false);
  });

  it("keeps a batch sellable throughout its expiry date", () => {
    const now = new Date("2026-09-03T18:45:00.000Z");

    expect(isStockDateExpired(new Date("2026-09-03T00:00:00.000Z"), now)).toBe(false);
    expect(isStockDateExpired(new Date("2026-09-02T00:00:00.000Z"), now)).toBe(true);
  });

  it("keeps stock adjustments explicit and signed", () => {
    const increase = inventoryBatchMutationInput.parse({ action: "adjust", direction: "increase", quantity: 8, reason: "Comptage de réception" });
    const decrease = inventoryBatchMutationInput.parse({ action: "adjust", direction: "decrease", quantity: 3, reason: "Casse constatée" });

    if (increase.action === "adjust" && decrease.action === "adjust") {
      expect(signedStockAdjustment(increase)).toBe(8);
      expect(signedStockAdjustment(decrease)).toBe(-3);
    }
  });

  it("removes blocked stock from sale and restores only active stock", () => {
    expect(statusAvailabilityDelta("active", "blocked", 24)).toBe(-24);
    expect(statusAvailabilityDelta("blocked", "active", 24)).toBe(24);
    expect(statusAvailabilityDelta("blocked", "recalled", 24)).toBe(0);
  });
});
