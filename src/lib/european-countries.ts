export type EuropeanCountry = {
  code: string;
  fr: string;
  en: string;
  aliases?: string[];
};

export const EUROPEAN_COUNTRIES: readonly EuropeanCountry[] = [
  { code: "FR", fr: "France", en: "France" },
  { code: "DE", fr: "Allemagne", en: "Germany" },
  { code: "AT", fr: "Autriche", en: "Austria" },
  { code: "BE", fr: "Belgique", en: "Belgium" },
  { code: "BG", fr: "Bulgarie", en: "Bulgaria" },
  { code: "CY", fr: "Chypre", en: "Cyprus" },
  { code: "HR", fr: "Croatie", en: "Croatia" },
  { code: "DK", fr: "Danemark", en: "Denmark" },
  { code: "ES", fr: "Espagne", en: "Spain" },
  { code: "EE", fr: "Estonie", en: "Estonia" },
  { code: "FI", fr: "Finlande", en: "Finland" },
  { code: "GR", fr: "Grèce", en: "Greece" },
  { code: "HU", fr: "Hongrie", en: "Hungary" },
  { code: "IE", fr: "Irlande", en: "Ireland" },
  { code: "IT", fr: "Italie", en: "Italy" },
  { code: "LV", fr: "Lettonie", en: "Latvia" },
  { code: "LT", fr: "Lituanie", en: "Lithuania" },
  { code: "LU", fr: "Luxembourg", en: "Luxembourg" },
  { code: "MT", fr: "Malte", en: "Malta" },
  { code: "NL", fr: "Pays-Bas", en: "Netherlands", aliases: ["The Netherlands"] },
  { code: "PL", fr: "Pologne", en: "Poland" },
  { code: "PT", fr: "Portugal", en: "Portugal" },
  { code: "CZ", fr: "Tchéquie", en: "Czechia", aliases: ["Czech Republic", "République tchèque"] },
  { code: "RO", fr: "Roumanie", en: "Romania" },
  { code: "SK", fr: "Slovaquie", en: "Slovakia" },
  { code: "SI", fr: "Slovénie", en: "Slovenia" },
  { code: "SE", fr: "Suède", en: "Sweden" },
  { code: "IS", fr: "Islande", en: "Iceland" },
  { code: "LI", fr: "Liechtenstein", en: "Liechtenstein" },
  { code: "NO", fr: "Norvège", en: "Norway" },
  { code: "CH", fr: "Suisse", en: "Switzerland" },
  { code: "GB", fr: "Royaume-Uni", en: "United Kingdom", aliases: ["UK", "Great Britain", "Grande-Bretagne"] },
];

export function europeanCountryOptions(locale: "fr" | "en") {
  return EUROPEAN_COUNTRIES.map((country) => ({ value: country.fr, code: country.code, label: country[locale] }));
}

export function europeanCountryCode(value: unknown) {
  return findCountry(value)?.code || null;
}

export function europeanCountryValue(value: unknown) {
  return findCountry(value)?.fr || null;
}

export function europeanCountryLabel(value: unknown, locale: "fr" | "en") {
  const country = findCountry(value);
  return country ? country[locale] : String(value || "");
}

function findCountry(value: unknown) {
  const key = normalizeCountry(value);
  if (!key) return null;
  return EUROPEAN_COUNTRIES.find((country) => [country.code, country.fr, country.en, ...(country.aliases || [])].some((candidate) => normalizeCountry(candidate) === key)) || null;
}

function normalizeCountry(value: unknown) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[.'’]/g, "")
    .replace(/[\s_-]+/g, " ");
}
