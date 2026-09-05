import { describe, expect, it } from "vitest";
import { EUROPEAN_COUNTRIES, europeanCountryCode, europeanCountryLabel, europeanCountryOptions, europeanCountryValue } from "./european-countries";

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
});
