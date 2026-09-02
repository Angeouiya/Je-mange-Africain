import { describe, expect, it } from "vitest";
import { deliveryServiceLabel } from "./format";

describe("deliveryServiceLabel", () => {
  it("translates persisted delivery service codes", () => {
    expect(deliveryServiceLabel("standard", "fr")).toBe("Livraison standard");
    expect(deliveryServiceLabel("express", "en")).toBe("Express delivery");
    expect(deliveryServiceLabel("relay", "fr")).toBe("Point relais");
  });

  it("preserves legacy free-text delivery slots", () => {
    expect(deliveryServiceLabel("Mercredi, 14 h - 18 h", "fr")).toBe("Mercredi, 14 h - 18 h");
    expect(deliveryServiceLabel(null, "en")).toBe("");
  });
});
