export type EuropeanCountry = {
  code: string;
  fr: string;
  en: string;
  postalCodePattern: RegExp;
  postalCodeExample: string;
  aliases?: string[];
};

export type EuropeanPostalCodeValidation = {
  valid: boolean;
  normalized: string;
  countryCode: string | null;
  example: string;
  reason: "required" | "unsupported_country" | "invalid_format" | null;
};

export const EUROPEAN_COUNTRIES: readonly EuropeanCountry[] = [
  { code: "FR", fr: "France", en: "France", postalCodePattern: /^\d{2} ?\d{3}$/, postalCodeExample: "75011" },
  { code: "DE", fr: "Allemagne", en: "Germany", postalCodePattern: /^\d{5}$/, postalCodeExample: "10115" },
  { code: "AT", fr: "Autriche", en: "Austria", postalCodePattern: /^\d{4}$/, postalCodeExample: "1010" },
  { code: "BE", fr: "Belgique", en: "Belgium", postalCodePattern: /^\d{4}$/, postalCodeExample: "1000" },
  { code: "BG", fr: "Bulgarie", en: "Bulgaria", postalCodePattern: /^\d{4}$/, postalCodeExample: "1000" },
  { code: "CY", fr: "Chypre", en: "Cyprus", postalCodePattern: /^\d{4}$/, postalCodeExample: "1010" },
  { code: "HR", fr: "Croatie", en: "Croatia", postalCodePattern: /^\d{5}$/, postalCodeExample: "10000" },
  { code: "DK", fr: "Danemark", en: "Denmark", postalCodePattern: /^\d{4}$/, postalCodeExample: "1050" },
  { code: "ES", fr: "Espagne", en: "Spain", postalCodePattern: /^\d{5}$/, postalCodeExample: "28013" },
  { code: "EE", fr: "Estonie", en: "Estonia", postalCodePattern: /^\d{5}$/, postalCodeExample: "10111" },
  { code: "FI", fr: "Finlande", en: "Finland", postalCodePattern: /^\d{5}$/, postalCodeExample: "00100" },
  { code: "GR", fr: "Grèce", en: "Greece", postalCodePattern: /^\d{3} ?\d{2}$/, postalCodeExample: "105 58" },
  { code: "HU", fr: "Hongrie", en: "Hungary", postalCodePattern: /^\d{4}$/, postalCodeExample: "1051" },
  { code: "IE", fr: "Irlande", en: "Ireland", postalCodePattern: /^[\dA-Z]{3} ?[\dA-Z]{4}$/, postalCodeExample: "D02 X285" },
  { code: "IT", fr: "Italie", en: "Italy", postalCodePattern: /^\d{5}$/, postalCodeExample: "00184" },
  { code: "LV", fr: "Lettonie", en: "Latvia", postalCodePattern: /^LV-\d{4}$/, postalCodeExample: "LV-1050" },
  { code: "LT", fr: "Lituanie", en: "Lithuania", postalCodePattern: /^\d{5}$/, postalCodeExample: "01100" },
  { code: "LU", fr: "Luxembourg", en: "Luxembourg", postalCodePattern: /^\d{4}$/, postalCodeExample: "1111" },
  { code: "MT", fr: "Malte", en: "Malta", postalCodePattern: /^[A-Z]{3} ?\d{2,4}$/, postalCodeExample: "VLT 1117" },
  { code: "NL", fr: "Pays-Bas", en: "Netherlands", postalCodePattern: /^[1-9]\d{3} ?(?:[A-RT-Z][A-Z]|S[BCE-RT-Z])$/, postalCodeExample: "1012 AB", aliases: ["The Netherlands"] },
  { code: "PL", fr: "Pologne", en: "Poland", postalCodePattern: /^\d{2}-\d{3}$/, postalCodeExample: "00-001" },
  { code: "PT", fr: "Portugal", en: "Portugal", postalCodePattern: /^\d{4}-\d{3}$/, postalCodeExample: "1000-001" },
  { code: "CZ", fr: "Tchéquie", en: "Czechia", postalCodePattern: /^\d{3} ?\d{2}$/, postalCodeExample: "110 00", aliases: ["Czech Republic", "République tchèque"] },
  { code: "RO", fr: "Roumanie", en: "Romania", postalCodePattern: /^\d{6}$/, postalCodeExample: "010011" },
  { code: "SK", fr: "Slovaquie", en: "Slovakia", postalCodePattern: /^\d{3} ?\d{2}$/, postalCodeExample: "811 01" },
  { code: "SI", fr: "Slovénie", en: "Slovenia", postalCodePattern: /^\d{4}$/, postalCodeExample: "1000" },
  { code: "SE", fr: "Suède", en: "Sweden", postalCodePattern: /^\d{3} ?\d{2}$/, postalCodeExample: "111 20" },
  { code: "IS", fr: "Islande", en: "Iceland", postalCodePattern: /^\d{3}$/, postalCodeExample: "101" },
  { code: "LI", fr: "Liechtenstein", en: "Liechtenstein", postalCodePattern: /^(?:948[5-9]|949[0-8])$/, postalCodeExample: "9490" },
  { code: "NO", fr: "Norvège", en: "Norway", postalCodePattern: /^\d{4}$/, postalCodeExample: "0150" },
  { code: "CH", fr: "Suisse", en: "Switzerland", postalCodePattern: /^\d{4}$/, postalCodeExample: "8001" },
  { code: "GB", fr: "Royaume-Uni", en: "United Kingdom", postalCodePattern: /^(?:GIR ?0AA|(?:(?:AB|AL|B|BA|BB|BD|BF|BH|BL|BN|BR|BS|BT|BX|CA|CB|CF|CH|CM|CO|CR|CT|CV|CW|DA|DD|DE|DG|DH|DL|DN|DT|DY|E|EC|EH|EN|EX|FK|FY|G|GL|GY|GU|HA|HD|HG|HP|HR|HS|HU|HX|IG|IM|IP|IV|JE|KA|KT|KW|KY|L|LA|LD|LE|LL|LN|LS|LU|M|ME|MK|ML|N|NE|NG|NN|NP|NR|NW|OL|OX|PA|PE|PH|PL|PO|PR|RG|RH|RM|S|SA|SE|SG|SK|SL|SM|SN|SO|SP|SR|SS|ST|SW|SY|TA|TD|TF|TN|TQ|TR|TS|TW|UB|W|WA|WC|WD|WF|WN|WR|WS|WV|YO|ZE)(?:\d[\dA-Z]? ?\d[ABD-HJLN-UW-Z]{2}))|BFPO ?\d{1,4})$/, postalCodeExample: "SW1A 1AA", aliases: ["UK", "Great Britain", "Grande-Bretagne"] },
];

export const EUROPEAN_COUNTRY_DIAL_CODES: Record<string, string> = {
  AT: "+43",
  BE: "+32",
  BG: "+359",
  CH: "+41",
  CY: "+357",
  CZ: "+420",
  DE: "+49",
  DK: "+45",
  EE: "+372",
  ES: "+34",
  FI: "+358",
  FR: "+33",
  GB: "+44",
  GR: "+30",
  HR: "+385",
  HU: "+36",
  IE: "+353",
  IS: "+354",
  IT: "+39",
  LI: "+423",
  LT: "+370",
  LU: "+352",
  LV: "+371",
  MT: "+356",
  NL: "+31",
  NO: "+47",
  PL: "+48",
  PT: "+351",
  RO: "+40",
  SE: "+46",
  SI: "+386",
  SK: "+421",
};

export function europeanCountryOptions(locale: "fr" | "en") {
  return EUROPEAN_COUNTRIES.map((country) => ({ value: country.fr, code: country.code, dialCode: EUROPEAN_COUNTRY_DIAL_CODES[country.code], label: country[locale] }));
}

export function europeanCountryCode(value: unknown) {
  return findCountry(value)?.code || null;
}

export function europeanCountryValue(value: unknown) {
  return findCountry(value)?.fr || null;
}

export function europeanCountryDialCode(value: unknown) {
  const code = europeanCountryCode(value);
  return code ? EUROPEAN_COUNTRY_DIAL_CODES[code] || "" : "";
}

export function europeanCountryLabel(value: unknown, locale: "fr" | "en") {
  const country = findCountry(value);
  return country ? country[locale] : String(value || "");
}

export function europeanPostalCodeExample(country: unknown) {
  return findCountry(country)?.postalCodeExample || "";
}

export function normalizeEuropeanPostalCode(country: unknown, value: unknown) {
  const countryCode = europeanCountryCode(country);
  const normalized = String(value || "").normalize("NFKC").trim().toUpperCase().replace(/\s+/g, " ");
  const compact = normalized.replace(/[\s-]/g, "");

  if (!normalized) return "";
  if (["FR", "GR", "CZ", "SK", "SE"].includes(countryCode || "") && /^\d{5}$/.test(compact)) {
    return countryCode === "FR" ? compact : `${compact.slice(0, 3)} ${compact.slice(3)}`;
  }
  if (countryCode === "IE" && /^[\dA-Z]{7}$/.test(compact)) return `${compact.slice(0, 3)} ${compact.slice(3)}`;
  if (countryCode === "LV" && /^(?:LV)?\d{4}$/.test(compact)) return `LV-${compact.replace(/^LV/, "")}`;
  if (countryCode === "MT" && /^[A-Z]{3}\d{2,4}$/.test(compact)) return `${compact.slice(0, 3)} ${compact.slice(3)}`;
  if (countryCode === "NL" && /^\d{4}[A-Z]{2}$/.test(compact)) return `${compact.slice(0, 4)} ${compact.slice(4)}`;
  if (countryCode === "PL" && /^\d{5}$/.test(compact)) return `${compact.slice(0, 2)}-${compact.slice(2)}`;
  if (countryCode === "PT" && /^\d{7}$/.test(compact)) return `${compact.slice(0, 4)}-${compact.slice(4)}`;
  if (countryCode === "GB" && compact.length > 3) return `${compact.slice(0, -3)} ${compact.slice(-3)}`;
  return normalized;
}

export function validateEuropeanPostalCode(country: unknown, value: unknown): EuropeanPostalCodeValidation {
  const countryDefinition = findCountry(country);
  const normalized = normalizeEuropeanPostalCode(country, value);
  if (!countryDefinition) return { valid: false, normalized, countryCode: null, example: "", reason: "unsupported_country" };
  if (!normalized) return { valid: false, normalized, countryCode: countryDefinition.code, example: countryDefinition.postalCodeExample, reason: "required" };
  const valid = countryDefinition.postalCodePattern.test(normalized);
  return { valid, normalized, countryCode: countryDefinition.code, example: countryDefinition.postalCodeExample, reason: valid ? null : "invalid_format" };
}

export function europeanPostalCodeMessage(country: unknown, value: unknown, locale: "fr" | "en") {
  const validation = validateEuropeanPostalCode(country, value);
  if (validation.valid) return "";
  if (validation.reason === "unsupported_country") return locale === "fr" ? "Ce pays n'est pas encore desservi." : "This country is not yet supported.";
  if (validation.reason === "required") return locale === "fr" ? "Saisissez le code postal de livraison." : "Enter the delivery postcode.";
  const label = europeanCountryLabel(country, locale);
  return locale === "fr"
    ? `Format attendu pour ${label} : ${validation.example}.`
    : `Expected format for ${label}: ${validation.example}.`;
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
