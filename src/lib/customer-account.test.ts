import { describe, expect, it } from "vitest";
import { customerAddressInput } from "@/lib/customer-account";

describe("customerAddressInput", () => {
  const validAddress = {
    label: "Domicile",
    firstName: "Awa",
    lastName: "Traore",
    street: "12 rue des Cultures",
    postalCode: "75011",
    city: "Paris",
    country: "France",
    phone: "00 33 6 12 34 56 78",
    isDefault: true,
  };

  it("normalizes an international recipient phone number", () => {
    expect(customerAddressInput.parse(validAddress).phone).toBe("+33612345678");
  });

  it("rejects incomplete delivery details", () => {
    const result = customerAddressInput.safeParse({ ...validAddress, street: "", phone: "0612" });
    expect(result.success).toBe(false);
  });
});
