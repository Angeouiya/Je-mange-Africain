import { describe, expect, it } from "vitest";
import { deliveryServiceLabel, orderStatusColor, orderStatusKey } from "./format";
import { dict } from "./i18n";

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

describe("international delivery status presentation", () => {
  it("translates carrier workflow codes in the customer experience", () => {
    expect(dict.fr.orders.statuses[orderStatusKey("picked_up") as keyof typeof dict.fr.orders.statuses]).toBe("Remise au transporteur");
    expect(dict.en.orders.statuses[orderStatusKey("out_for_delivery") as keyof typeof dict.en.orders.statuses]).toBe("Out for delivery");
    expect(dict.fr.orders.statuses[orderStatusKey("created") as keyof typeof dict.fr.orders.statuses]).toBe("Colis créé");
  });

  it("keeps active carrier stages in the brand delivery palette", () => {
    expect(orderStatusColor("picked_up")).toContain("text-terre");
    expect(orderStatusColor("out_for_delivery")).toContain("text-terre");
  });
});
