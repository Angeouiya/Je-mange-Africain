import { BRAND_ACCENT_COLORS, BRAND_COLORS } from "@/lib/brand-colors";

export type MarketLocale = "fr" | "en";

type CategoryLike = {
  slug?: string | null;
  name?: string | null;
  color?: string | null;
};

type MarketSubject = {
  slug?: string | null;
  name?: string | null;
  traditionalName?: string | null;
  description?: string | null;
  country?: string | null;
  thermalClass?: string | null;
  category?: CategoryLike | string | null;
  categorySlug?: string | null;
  categoryName?: string | null;
  imageEmoji?: string | null;
  imageUrl?: string | null;
  photoUrl?: string | null;
  galleryUrls?: string[] | string | null;
  price?: number | null;
  promoPrice?: number | null;
};

const unsplash = (id: string, width = 1200) =>
  `https://images.unsplash.com/photo-${id}?ixlib=rb-4.0.3&auto=format&fit=crop&w=${width}&q=78`;

export const MARKET_PHOTOS = {
  africanMarket: unsplash("1542838132-92c53300491e"),
  spiceVendor: unsplash("1566385101042-1a0aa0c1268c"),
  cassava: "/products/gari-blanc.webp",
  plantain: "/products/banane-plantain.webp",
  okra: "/products/gombo-frais.webp",
  peanuts: "/products/arachides.webp",
  chili: "/products/piment-frais.webp",
  riceCooked: unsplash("1504674900247-0877df9cc836"),
  riceGrain: "/products/farine-riz.webp",
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

const RECIPE_PHOTOS: Record<string, string> = {
  "sauce-graine": "/recipes/sauce-graine.webp",
  "sauce-gombo": "/recipes/sauce-gombo.webp",
  "attieke-poisson": "/recipes/attieke-poisson.webp",
  "placali-sauce-graine": "/recipes/placali-sauce-graine.webp",
  "alloco-poulet": "/recipes/alloco-poulet.webp",
  mafe: "/recipes/mafe.webp",
};

const PRODUCT_PHOTOS: Record<string, string> = {
  "placali-frais": "/products/placali-frais.webp",
  placali: "/products/placali-frais.webp",
  attieke: "/products/attieke.webp",
  "gari-blanc": "/products/gari-blanc.webp",
  gari: "/products/gari-blanc.webp",
  garri: "/products/gari-blanc.webp",
  "fufu-manioc": "/products/fufu-manioc.webp",
  "fufu-de-manioc": "/products/fufu-manioc.webp",
  fufu: "/products/fufu-manioc.webp",
  foufou: "/products/fufu-manioc.webp",
  "farine-mil": "/products/farine-mil.webp",
  "farine-de-mil": "/products/farine-mil.webp",
  "farine-riz": "/products/farine-riz.webp",
  "farine-de-riz": "/products/farine-riz.webp",
  "kplo-fume": "/products/kplo-fume.webp",
  tripes: "/products/tripes.webp",
  "poulet-fermier": "/products/poulet-fermier.webp",
  "maquereau-fume": "/products/maquereau-fume.webp",
  "morue-salee": "/products/morue-salee.webp",
  morue: "/products/morue-salee.webp",
  tilapia: "/products/tilapia.webp",
  "tilapia-entier": "/products/tilapia.webp",
  "banane-plantain": "/products/banane-plantain.webp",
  plantain: "/products/banane-plantain.webp",
  "gombo-frais": "/products/gombo-frais.webp",
  "piment-frais": "/products/piment-frais.webp",
  "pate-arachide": "/products/pate-arachide.webp",
  "pate-d-arachide": "/products/pate-arachide.webp",
  dakatine: "/products/pate-arachide.webp",
  djoumble: "/products/djoumble.webp",
  "djoumble-poudre": "/products/djoumble.webp",
  akpi: "/products/akpi.webp",
  njansang: "/products/akpi.webp",
  soumbala: "/products/soumbala.webp",
  soumbara: "/products/soumbala.webp",
  "feuilles-manioc": "/products/feuilles-manioc.webp",
  "feuilles-de-manioc": "/products/feuilles-manioc.webp",
  "graine-palme": "/products/graine-palme.webp",
  "graine-de-palme": "/products/graine-palme.webp",
  "huile-palme": "/products/huile-palme.webp",
  "huile-de-palme": "/products/huile-palme.webp",
  "piment-poudre": "/products/piment-poudre.webp",
  "piment-en-poudre": "/products/piment-poudre.webp",
  "concentre-tomate": "/products/concentre-tomate.webp",
  "concentre-de-tomate": "/products/concentre-tomate.webp",
  egousi: "/products/egousi.webp",
  niebe: "/products/niebe.webp",
  arachides: "/products/arachides.webp",
  arachide: "/products/arachides.webp",
  chikwangue: "/products/chikwangue.webp",
  fonio: "/products/fonio.webp",
  "poudre-baobab": "/products/poudre-baobab.webp",
  "poudre-de-baobab": "/products/poudre-baobab.webp",
  bissap: "/products/bissap.webp",
  gingembre: "/products/gingembre.webp",
  "gingembre-en-poudre": "/products/gingembre.webp",
  thiakry: "/products/thiakry.webp",
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

const mediaKey = (value?: string | null) =>
  norm(value).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const BRAND_FALLBACK_COLOR = BRAND_COLORS.burgundy;

/** Keeps chromatic media accents inside the logo palette while preserving neutral surfaces. */
export function getBrandAccentColor(color?: string | null) {
  const match = color?.trim().match(/^#([0-9a-f]{6})$/i);
  if (!match) return BRAND_FALLBACK_COLOR;

  const value = Number.parseInt(match[1], 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  const chroma = Math.max(red, green, blue) - Math.min(red, green, blue);
  if (chroma <= 28) return Math.max(red, green, blue) < 64 ? BRAND_COLORS.charcoal : color!;

  return BRAND_ACCENT_COLORS.reduce((closest, candidate) => {
    const candidateValue = Number.parseInt(candidate.slice(1), 16);
    const candidateRed = (candidateValue >> 16) & 255;
    const candidateGreen = (candidateValue >> 8) & 255;
    const candidateBlue = candidateValue & 255;
    const distance = (red - candidateRed) ** 2 + (green - candidateGreen) ** 2 + (blue - candidateBlue) ** 2;
    return distance < closest.distance ? { color: candidate, distance } : closest;
  }, { color: BRAND_FALLBACK_COLOR as string, distance: Number.POSITIVE_INFINITY }).color;
}

function categorySlug(subject: MarketSubject | CategoryLike | string) {
  if (typeof subject === "string") return norm(subject);
  if ("category" in subject && subject.category) {
    if (typeof subject.category === "string") return norm(subject.category);
    return norm(subject.category.slug || subject.category.name);
  }
  const value = subject as MarketSubject & CategoryLike;
  return norm(value.slug || value.categorySlug || value.categoryName || value.name);
}

export function getCategoryPhoto(category: MarketSubject | CategoryLike | string) {
  const slug = categorySlug(category);
  return CATEGORY_PHOTOS[slug] || MARKET_PHOTOS.africanMarket;
}

export function getProductPhoto(product: MarketSubject) {
  if (product.imageUrl || product.photoUrl) return product.imageUrl || product.photoUrl || MARKET_PHOTOS.africanMarket;
  const productPhoto = PRODUCT_PHOTOS[mediaKey(product.slug)]
    || PRODUCT_PHOTOS[mediaKey(product.traditionalName)]
    || PRODUCT_PHOTOS[mediaKey(product.name)];
  if (productPhoto) return productPhoto;
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
  if (recipe.imageUrl || recipe.photoUrl) return recipe.imageUrl || recipe.photoUrl || MARKET_PHOTOS.africanMarket;
  const recipeKey = mediaKey(recipe.slug || recipe.title || recipe.name);
  if (RECIPE_PHOTOS[recipeKey]) return RECIPE_PHOTOS[recipeKey];
  return getProductPhoto({
    ...recipe,
    name: recipe.title || recipe.name,
    traditionalName: recipe.categoryName || (typeof recipe.category === "string" ? recipe.category : recipe.category?.name),
  });
}

export function getProductGallery(product: MarketSubject) {
  let gallery: string[] = [];
  if (Array.isArray(product.galleryUrls)) gallery = product.galleryUrls;
  else if (product.galleryUrls) {
    try { gallery = JSON.parse(product.galleryUrls); } catch { gallery = []; }
  }
  return Array.from(new Set([
    getProductPhoto(product),
    ...gallery,
  ].filter(Boolean)));
}

export function getRecipeGallery(recipe: MarketSubject & { title?: string | null; category?: string | CategoryLike | null }) {
  let gallery: string[] = [];
  if (Array.isArray(recipe.galleryUrls)) gallery = recipe.galleryUrls;
  else if (recipe.galleryUrls) {
    try { gallery = JSON.parse(recipe.galleryUrls); } catch { gallery = []; }
  }
  return Array.from(new Set([
    getRecipePhoto(recipe),
    ...gallery,
  ].filter(Boolean)));
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
