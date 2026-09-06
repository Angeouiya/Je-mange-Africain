export const COMPANY_PROFILE = {
  legalName: "Promise Corporation",
  brandName: "Je mange Africain",
  website: "https://je-mange-africain.com",
  email: "bonjour@je-mange-africain.com",
  privacyEmail: "confidentialite@je-mange-africain.com",
  locations: {
    france: {
      labelFr: "France, Paris",
      labelEn: "France, Paris",
      streetAddress: "34 avenue du Président Salvador Allende",
      postalCode: "93100",
      city: "Montreuil",
      country: "France",
      addressLine: "34 avenue du Président Salvador Allende, 93100 Montreuil, France",
      phoneDisplay: "+33 7 69 59 16 42",
      phoneHref: "+33769591642",
    },
    ivoryCoast: {
      labelFr: "Côte d'Ivoire, Abidjan",
      labelEn: "Côte d'Ivoire, Abidjan",
      streetAddress: "Riviera Faya, derrière Playce, non loin de la mosquée Génie 2000",
      city: "Abidjan",
      country: "Côte d'Ivoire",
      addressLine: "Riviera Faya, derrière Playce, non loin de la mosquée Génie 2000, Abidjan, Côte d'Ivoire",
      phoneDisplay: "+225 07 57 39 68 37",
      phoneHref: "+2250757396837",
    },
  },
} as const;

export const PRIMARY_BUSINESS_LOCATION = COMPANY_PROFILE.locations.france;
