import { describe, expect, it } from "vitest";
import { EUROPEAN_COUNTRIES, europeanCountryCode, europeanCountryLabel, europeanCountryOptions, europeanCountryValue, normalizeEuropeanPostalCode, validateEuropeanPostalCode } from "./european-countries";

describe("European checkout countries", () => {
  it("covers the EU, EEA, Switzerland and the United Kingdom", () => {
    expect(EUROPEAN_COUNTRIES).toHaveLength(32);
    expect(europeanCountryOptions("fr").map((country) => country.code)).toEqual(expect.arrayContaining(["FR", "PL", "SE", "IS", "LI", "NO", "CH", "GB"]));
  });

  it("resolves codes and bilingual names without silently falling back", () => {
    expect(europeanCountryCode("Tchéquie")).toBe("CZ");
    expect(europeanCountryCode("Czech Republic")).toBe("CZ");
    expect(europeanCountryCode("UK")).toBe("GB");
    expect(europeanCountryCode("Atlantide")).toBeNull();
    expect(europeanCountryValue("Germany")).toBe("Allemagne");
    expect(europeanCountryLabel("CH", "fr")).toBe("Suisse");
    expect(europeanCountryLabel("Suisse", "en")).toBe("Switzerland");
  });

  it("accepts the official example format for every supported country", () => {
    for (const country of EUROPEAN_COUNTRIES) {
      expect(validateEuropeanPostalCode(country.code, country.postalCodeExample), country.code).toMatchObject({ valid: true, countryCode: country.code });
    }
  });

  it("normalizes common compact entries without changing their destination", () => {
    expect(normalizeEuropeanPostalCode("Pays-Bas", "1012ab")).toBe("1012 AB");
    expect(normalizeEuropeanPostalCode("Pologne", "00001")).toBe("00-001");
    expect(normalizeEuropeanPostalCode("Portugal", "1000001")).toBe("1000-001");
    expect(normalizeEuropeanPostalCode("Royaume-Uni", "sw1a1aa")).toBe("SW1A 1AA");
    expect(normalizeEuropeanPostalCode("Lettonie", "1050")).toBe("LV-1050");
  });

  it("rejects unsupported destinations and country-mismatched formats", () => {
    expect(validateEuropeanPostalCode("Atlantide", "75011").reason).toBe("unsupported_country");
    expect(validateEuropeanPostalCode("Allemagne", "7501")).toMatchObject({ valid: false, reason: "invalid_format", example: "10115" });
    expect(validateEuropeanPostalCode("Pays-Bas", "75011").valid).toBe(false);
  });
});
