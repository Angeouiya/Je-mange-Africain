export type MarketLocale = "fr" | "en";

type CategoryLike = {
  slug?: string | null;
  name?: string | null;
  color?: string | null;
};

type MarketSubject = {
  name?: string | null;
  traditionalName?: string | null;
  description?: string | null;
  country?: string | null;
  thermalClass?: string | null;
  category?: CategoryLike | string | null;
  categorySlug?: string | null;
  categoryName?: string | null;
  imageEmoji?: string | null;
  price?: number | null;
  promoPrice?: number | null;
};

const unsplash = (id: string, width = 1200) =>
  `https://images.unsplash.com/photo-${id}?ixlib=rb-4.0.3&auto=format&fit=crop&w=${width}&q=78`;

export const MARKET_PHOTOS = {
  africanMarket: unsplash("1542838132-92c53300491e"),
  spiceVendor: unsplash("1566385101042-1a0aa0c1268c"),
  cassava: unsplash("1518977676601-b53f82aba655"),
  plantain: unsplash("1473093295043-cdd812d0e601"),
  okra: unsplash("1540420773420-3366772f4999"),
  peanuts: unsplash("1601004890684-d8cbf643f5f2"),
  chili: unsplash("1512621776951-a57141f2eefd"),
  riceCooked: unsplash("1504674900247-0877df9cc836"),
  riceGrain: unsplash("1511690743698-d9d85f2fbf38"),
};

const CATEGORY_PHOTOS: Record<string, string> = {
  manioc: MARKET_PHOTOS.cassava,
  farines: MARKET_PHOTOS.riceGrain,
  viandes: MARKET_PHOTOS.africanMarket,
  poissons: MARKET_PHOTOS.spiceVendor,
  legumes: MARKET_PHOTOS.okra,
  sauces: MARKET_PHOTOS.chili,
  legumineuses: MARKET_PHOTOS.peanuts,
  boissons: MARKET_PHOTOS.spiceVendor,
};

const KEYWORD_PHOTOS: Array<{ terms: string[]; photo: string }> = [
  { terms: ["attieke", "garba", "jollof", "thieboudienne", "waakye", "riz gras"], photo: MARKET_PHOTOS.riceCooked },
  { terms: ["placali", "gari", "garri", "fufu", "foufou", "chikwangue", "kwanga", "manioc", "cassava"], photo: MARKET_PHOTOS.africanMarket },
  { terms: ["plantain", "banane", "alloco"], photo: MARKET_PHOTOS.plantain },
  { terms: ["gombo", "okra"], photo: MARKET_PHOTOS.okra },
  { terms: ["arachide", "peanut", "dakatine", "mafe", "mafe"], photo: MARKET_PHOTOS.peanuts },
  { terms: ["piment", "chili", "epice", "epices", "poivre", "condiment", "akpi", "njansang", "soumbala", "cube"], photo: MARKET_PHOTOS.chili },
  { terms: ["riz", "rice", "fonio", "mil", "millet", "mais", "cereale", "cereales", "farine"], photo: MARKET_PHOTOS.riceGrain },
  { terms: ["poisson", "fish", "capitaine", "tilapia", "crevette", "seafood"], photo: MARKET_PHOTOS.spiceVendor },
  { terms: ["kplo", "kplo", "tripe", "tripes", "boeuf", "boeuf", "viande"], photo: MARKET_PHOTOS.africanMarket },
  { terms: ["bissap", "hibiscus", "gingembre", "jus", "boisson"], photo: MARKET_PHOTOS.spiceVendor },
];

const norm = (value?: string | null) =>
  (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

function categorySlug(subject: MarketSubject | CategoryLike | string) {
  if (typeof subject === "string") return norm(subject);
  if ("category" in subject && subject.category) {
    if (typeof subject.category === "string") return norm(subject.category);
    return norm(subject.category.slug || subject.category.name);
  }
  return norm(subject.slug || subject.categorySlug || subject.categoryName || subject.name);
}

export function getCategoryPhoto(category: MarketSubject | CategoryLike | string) {
  const slug = categorySlug(category);
  return CATEGORY_PHOTOS[slug] || MARKET_PHOTOS.africanMarket;
}

export function getProductPhoto(product: MarketSubject) {
  const haystack = norm([
    product.name,
    product.traditionalName,
    product.description,
    product.categorySlug,
    product.categoryName,
    typeof product.category === "string" ? product.category : product.category?.slug,
    typeof product.category === "string" ? "" : product.category?.name,
    product.imageEmoji,
  ].filter(Boolean).join(" "));

  const direct = KEYWORD_PHOTOS.find((entry) => entry.terms.some((term) => haystack.includes(term)));
  return direct?.photo || getCategoryPhoto(product);
}

export function getRecipePhoto(recipe: MarketSubject & { title?: string | null; category?: string | CategoryLike | null }) {
  return getProductPhoto({
    ...recipe,
    name: recipe.title || recipe.name,
    traditionalName: recipe.categoryName || (typeof recipe.category === "string" ? recipe.category : recipe.category?.name),
  });
}

export function getProductGallery(product: MarketSubject) {
  return Array.from(new Set([
    getProductPhoto(product),
    getCategoryPhoto(product),
    MARKET_PHOTOS.africanMarket,
  ]));
}

export function getDiscountPercent(price?: number | null, promoPrice?: number | null) {
  if (!price || !promoPrice || promoPrice >= price) return 0;
  return Math.max(1, Math.round(((price - promoPrice) / price) * 100));
}

export function getProductCommercialLine(product: MarketSubject, locale: MarketLocale) {
  const country = product.country || (locale === "fr" ? "Afrique" : "Africa");
  const thermal =
    product.thermalClass === "FROZEN"
      ? locale === "fr" ? "chaîne du froid suivie" : "tracked cold chain"
      : product.thermalClass === "REFRIGERATED"
        ? locale === "fr" ? "frais maîtrisé" : "controlled chilled handling"
        : locale === "fr" ? "stock sec contrôlé" : "controlled ambient stock";

  return locale === "fr"
    ? `Sélection ${country} · ${thermal} · expédition organisée par Je mange Africain`
    : `${country} selection · ${thermal} · fulfilment managed by Je mange Africain`;
}

export function getProductObjective(product: MarketSubject, locale: MarketLocale) {
  const subject = norm(`${product.name || ""} ${product.traditionalName || ""} ${product.categoryName || ""}`);
  if (subject.includes("manioc") || subject.includes("attieke") || subject.includes("placali") || subject.includes("fufu")) {
    return locale === "fr"
      ? {
          title: "Retrouver la texture juste du manioc",
          body: "Un produit pensé pour obtenir une base souple, régulière et fidèle aux repas de famille, sans multiplier les essais en cuisine.",
        }
      : {
          title: "Bring back the right cassava texture",
          body: "A product selected for a soft, reliable base that feels faithful to family cooking without repeated trial and error.",
        };
  }
  if (subject.includes("piment") || subject.includes("gombo") || subject.includes("sauce") || subject.includes("akpi")) {
    return locale === "fr"
      ? {
          title: "Donner du relief à la sauce",
          body: "La fiche met en avant le goût, l’usage et la conservation pour aider le client à acheter exactement l’ingrédient qui fera la différence.",
        }
      : {
          title: "Give the sauce real depth",
          body: "The page highlights taste, usage and storage so customers pick the ingredient that truly changes the dish.",
        };
  }
  if (subject.includes("riz") || subject.includes("fonio") || subject.includes("mil")) {
    return locale === "fr"
      ? {
          title: "Construire une assiette généreuse",
          body: "Une base céréalière fiable, facile à doser, avec des informations claires pour comparer format, prix et usage.",
        }
      : {
          title: "Build a generous plate",
          body: "A reliable grain base, easy to portion, with clear information for comparing pack size, price and use.",
        };
  }
  return locale === "fr"
    ? {
        title: "Acheter avec assurance",
        body: "Origine, usage, format, conservation et disponibilité sont regroupés pour transformer la fiche produit en véritable aide à la décision.",
      }
    : {
        title: "Buy with confidence",
        body: "Origin, use, pack size, storage and availability are gathered to turn this product page into a genuine decision aid.",
      };
}
