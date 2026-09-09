import { describe, expect, it } from "vitest";
import { normalizePhoneForCountry } from "./customer-auth";

describe("customer auth phone normalization", () => {
  it("adds the selected European country dial code to local numbers", () => {
    expect(normalizePhoneForCountry("06 12 34 56 78", "France")).toBe("+33612345678");
    expect(normalizePhoneForCountry("07700 900123", "Royaume-Uni")).toBe("+447700900123");
  });

  it("keeps international numbers and 00 prefixes stable", () => {
    expect(normalizePhoneForCountry("+44 7700 900123", "France")).toBe("+447700900123");
    expect(normalizePhoneForCountry("0033 6 12 34 56 78", "France")).toBe("+33612345678");
  });
});
