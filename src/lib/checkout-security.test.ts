import { describe, expect, it } from "vitest";
import { deliveryContactFingerprint } from "./checkout-security";

const contact = {
  firstName: "Awa",
  lastName: "Traoré",
  email: "awa@example.fr",
  phone: "+33 6 12 34 56 78",
  street: "12 rue de la Gare",
  postalCode: "75011",
  city: "Paris",
  country: "France",
};

describe("checkout delivery contact fingerprint", () => {
  it("is stable across harmless e-mail casing and surrounding spaces", () => {
    expect(deliveryContactFingerprint(contact)).toBe(deliveryContactFingerprint({ ...contact, email: " AWA@EXAMPLE.FR " }));
  });

  it("changes when the delivery identity changes after payment", () => {
    expect(deliveryContactFingerprint(contact)).not.toBe(deliveryContactFingerprint({ ...contact, phone: "+33 6 00 00 00 00" }));
  });
});
