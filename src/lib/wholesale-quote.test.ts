import { describe, expect, it } from "vitest";
import { canTransitionWholesaleQuote, createWholesaleQuoteReference, WholesaleQuoteRequestInput } from "./wholesale-quote";

describe("wholesale quote workflow", () => {
  it("creates a readable, dated and collision-resistant business reference", () => {
    expect(createWholesaleQuoteReference(new Date("2026-09-05T12:00:00.000Z"), "a1b2c3d4-e5f6-7890-abcd-ef1234567890")).toBe("JMA-GROS-260905-A1B2C3");
  });

  it("requires a selection or a free-form product requirement", () => {
    const result = WholesaleQuoteRequestInput.safeParse({ locale: "fr", company: "Maison Awa", contactName: "Awa Traore", email: "awa@example.fr", phone: "+33612345678", country: "France", postalCode: "75011", deliveryRequirements: "Livraison réfrigérée le mardi matin.", items: [] });
    expect(result.success).toBe(false);
  });

  it("prevents skipping commercial qualification stages", () => {
    expect(canTransitionWholesaleQuote("new", "reviewing")).toBe(true);
    expect(canTransitionWholesaleQuote("reviewing", "accepted")).toBe(false);
    expect(canTransitionWholesaleQuote("quoted", "accepted")).toBe(true);
    expect(canTransitionWholesaleQuote("accepted", "reviewing")).toBe(false);
  });
});
