import type { Page } from "@playwright/test";

const category = {
  id: "fixture-category-manioc",
  slug: "manioc",
  name: "Manioc & dérivés",
  nameFr: "Manioc & dérivés",
  nameEn: "Cassava & derivatives",
  color: "#B9472B",
  icon: "cassava",
  description: "Semoules, farines et accompagnements issus du manioc.",
};

const productSeeds = [
  ["attieke", "Attiéké frais", "Fresh attieke", "Attiéké", "/products/attieke.webp", 7.5, 5.9, "Sachet 500 g"],
  ["gombo", "Gombo frais", "Fresh okra", "Gombo", "/products/gombo-frais.webp", 6.4, 5.4, "Sachet 500 g"],
  ["arachide", "Pâte d'arachide", "Peanut paste", "Tiga dèguè", "/products/pate-arachide.webp", 5.8, 4.9, "Pot 500 g"],
  ["plantain", "Banane plantain", "Plantain", "Alloco", "/products/banane-plantain.webp", 4.9, 4.2, "Régime 1 kg"],
  ["egousi", "Égousi", "Egusi", "Égousi", "/products/egousi.webp", 6.9, 5.8, "Sachet 500 g"],
  ["piment", "Piment frais", "Fresh chilli", "Piment", "/products/piment-frais.webp", 3.8, 3.2, "Barquette 250 g"],
] as const;

export const publishedProducts = productSeeds.map(([slug, nameFr, nameEn, traditionalName, imageUrl, price, promoPrice, packaging], index) => ({
  id: `fixture-product-${slug}`,
  sku: `FIXTURE-${String(index + 1).padStart(3, "0")}`,
  barcode: null,
  traditionalName,
  name: nameFr,
  nameFr,
  nameEn,
  description: `Produit africain sélectionné pour une cuisine quotidienne soignée.`,
  descriptionFr: `Produit africain sélectionné pour une cuisine quotidienne soignée.`,
  descriptionEn: "Selected African product for carefully prepared everyday cooking.",
  preparation: "Préparer selon l'usage culinaire indiqué et servir sans attendre.",
  storage: "Conserver dans un endroit frais et sec.",
  ingredients: traditionalName,
  allergens: slug === "arachide" ? "Arachides" : null,
  country: index < 2 || index === 3 ? "Côte d'Ivoire" : index === 2 ? "Mali" : "Nigeria",
  thermalClass: index === 0 || index === 1 || index === 3 || index === 5 ? "REFRIGERATED" : "AMBIANT",
  storageType: "dry",
  storageTempC: null,
  netWeightGrams: 500,
  volumeMl: null,
  unit: "unité",
  packaging,
  price,
  promoPrice,
  pricePerKg: price * 2,
  isWholesale: false,
  wholesalePackLabel: null,
  wholesaleUnitsPerPack: 1,
  wholesaleMinPacks: 1,
  wholesalePrice: null,
  wholesaleTiers: [],
  wholesaleAvailablePacks: 0,
  wholesaleDiscountPercent: 0,
  stockQty: 30 - index,
  alertThreshold: 5,
  imageColor: index % 2 ? "#F2A900" : "#B9472B",
  imageEmoji: "",
  imageUrl,
  isBestseller: true,
  isNew: index < 2,
  isRecommended: index === 0,
  isOnSale: true,
  categoryId: category.id,
  brandId: null,
  brandName: "Je mange Africain",
  category: { id: category.id, slug: category.slug, name: category.nameFr, icon: category.icon, color: category.color },
  variants: slug === "attieke"
    ? [
        { id: "fixture-attieke-500", label: "Sachet 500 g", weightGrams: 500, volumeMl: null, price: 5.9, pricePerKg: 11.8, isDefault: true },
        { id: "fixture-attieke-800", label: "Pot 800 g", weightGrams: 800, volumeMl: null, price: 9.9, pricePerKg: 12.38, isDefault: false },
      ]
    : [{ id: `fixture-${slug}-500`, label: packaging, weightGrams: 500, volumeMl: null, price: promoPrice, pricePerKg: promoPrice * 2, isDefault: true }],
}));

export const publishedRecipes = [
  {
    id: "fixture-recipe-mafe",
    slug: "mafe",
    country: "Mali",
    category: "mains",
    difficulty: "easy",
    timeMinutes: 65,
    baseServings: 4,
    imageColor: "#8A3042",
    imageEmoji: "",
    imageUrl: "/recipes/mafe.webp",
    isPopular: true,
    isNew: false,
    isRecommended: true,
    ingredientCount: 1,
    title: "Mafé traditionnel",
    titleFr: "Mafé traditionnel",
    titleEn: "Traditional mafe",
    description: "Une sauce d'arachide mijotée, adaptable au nombre de convives.",
    descriptionFr: "Une sauce d'arachide mijotée, adaptable au nombre de convives.",
    descriptionEn: "A slow-cooked peanut sauce that adapts to the number of guests.",
  },
  {
    id: "fixture-recipe-attieke",
    slug: "attieke-poisson",
    country: "Côte d'Ivoire",
    category: "mains",
    difficulty: "medium",
    timeMinutes: 45,
    baseServings: 4,
    imageColor: "#B9472B",
    imageEmoji: "",
    imageUrl: "/recipes/attieke-poisson.webp",
    isPopular: true,
    isNew: true,
    isRecommended: false,
    ingredientCount: 1,
    title: "Attiéké poisson braisé",
    titleFr: "Attiéké poisson braisé",
    titleEn: "Attieke with grilled fish",
    description: "Une assiette ivoirienne généreuse, expliquée geste par geste.",
    descriptionFr: "Une assiette ivoirienne généreuse, expliquée geste par geste.",
    descriptionEn: "A generous Ivorian plate explained step by step.",
  },
];

const recipeCategories = [
  { slug: "sauces", name: "Sauces" },
  { slug: "mains", name: "Plats complets" },
  { slug: "sides", name: "Accompagnements" },
  { slug: "grill", name: "Grillades" },
];

export function catalogFixture(urlValue: string) {
  const url = new URL(urlValue);
  const english = url.searchParams.get("locale") === "en";
  const products = publishedProducts.map((product) => ({
    ...product,
    name: english ? product.nameEn : product.nameFr,
    description: english ? product.descriptionEn : product.descriptionFr,
    category: { ...product.category, name: english ? category.nameEn : category.nameFr },
  }));
  if (url.searchParams.get("section") === "home") {
    return {
      categories: [{ ...category, name: english ? category.nameEn : category.nameFr }],
      brands: [],
      bestsellers: products,
      news: products.slice(0, 2),
      onSale: products.slice(0, 4),
      popularRecipes: localizedRecipes(english),
    };
  }
  return {
    products,
    total: products.length,
    page: 1,
    pageSize: 48,
    pages: 1,
    filters: {
      categories: [{ id: category.id, slug: category.slug, name: english ? category.nameEn : category.nameFr, color: category.color }],
      brands: [],
      countries: [...new Set(products.map((product) => product.country))],
    },
  };
}

export function recipeListFixture(urlValue: string) {
  const english = new URL(urlValue).searchParams.get("locale") === "en";
  return {
    recipes: localizedRecipes(english),
    categories: recipeCategories.map((item) => ({ ...item, name: english && item.slug === "mains" ? "Full dishes" : item.name })),
  };
}

export function productDetailFixture(urlValue: string) {
  const url = new URL(urlValue);
  const id = decodeURIComponent(url.pathname.split("/").at(-1) || "");
  const english = url.searchParams.get("locale") === "en";
  const source = publishedProducts.find((product) => product.id === id) || publishedProducts[0];
  return {
    ...source,
    name: english ? source.nameEn : source.nameFr,
    description: english ? source.descriptionEn : source.descriptionFr,
    galleryUrls: [source.imageUrl],
    nutrition: { energy: "620 kJ", fat: "1.2 g", carbs: "34 g", protein: "1.4 g", salt: "0.2 g" },
    brand: { id: "fixture-brand-jma", name: "Je mange Africain" },
    category: { id: category.id, slug: category.slug, name: english ? category.nameEn : category.nameFr },
    aliases: [source.traditionalName],
    related: publishedProducts.slice(1, 3),
    relatedRecipes: localizedRecipes(english).slice(0, 1),
    alternatives: publishedProducts.slice(1, 3),
  };
}

export function recipeDetailFixture(urlValue: string) {
  const url = new URL(urlValue);
  const id = decodeURIComponent(url.pathname.split("/").at(-1) || "");
  const english = url.searchParams.get("locale") === "en";
  const source = publishedRecipes.find((recipe) => recipe.id === id) || publishedRecipes[0];
  const product = publishedProducts[2];
  const steps = english
    ? ["Brown the aromatics over medium heat for 8 minutes.", "Stir in the peanut paste, then simmer gently for 35 minutes."]
    : ["Faire revenir les aromates 8 minutes à feu moyen.", "Délayer la pâte d'arachide puis laisser mijoter doucement 35 minutes."];
  return {
    ...source,
    title: english ? source.titleEn : source.titleFr,
    description: english ? source.descriptionEn : source.descriptionFr,
    galleryUrls: [source.imageUrl, "/recipes/sauce-graine.webp"],
    steps,
    stepDetails: steps.map((instruction, index) => ({
      instruction,
      title: index === 0 ? (english ? "Build the aromatic base" : "Construire la base aromatique") : (english ? "Control the simmer" : "Maîtriser le mijotage"),
      durationMinutes: index === 0 ? 8 : 35,
      restMinutes: 0,
      heat: index === 0 ? "medium" : "low",
      temperatureC: index === 0 ? 92 : null,
      equipment: english ? "Heavy pot and wooden spoon" : "Cocotte à fond épais et cuillère en bois",
      cue: english ? "The sauce is smooth, glossy and coats the spoon." : "La sauce est homogène, brillante et nappe la cuillère.",
      tip: english ? "Stir regularly along the bottom of the pot." : "Remuer régulièrement au fond de la cocotte.",
      warning: index === 0
        ? (english ? "Keep hot steam away from the face and hands." : "Diriger la vapeur loin du visage et des mains.")
        : null,
      why: english ? "Gentle cooking develops flavour without splitting the sauce." : "La cuisson douce développe les arômes sans trancher la sauce.",
      recovery: english ? "Add a little hot water if the sauce becomes too thick." : "Ajouter un peu d'eau chaude si la sauce devient trop épaisse.",
      ingredientProductIds: index === 1 ? [product.id] : [],
    })),
    ingredients: [{
      recipeIngredientId: "fixture-recipe-ingredient-arachide",
      productId: product.id,
      variantId: product.variants[0].id,
      quantityPerBase: 500,
      unit: "g",
      role: "base",
      optional: false,
      alternatives: JSON.stringify([publishedProducts[4].id]),
      note: null,
      product: {
        id: product.id,
        traditionalName: product.traditionalName,
        emoji: product.imageEmoji,
        imageUrl: product.imageUrl,
        color: product.imageColor,
        thermalClass: product.thermalClass,
        stockQty: product.stockQty,
        categoryId: product.categoryId,
        nameFr: product.nameFr,
        nameEn: product.nameEn,
        variants: product.variants,
      },
    }],
  };
}

export async function mockPublishedStorefront(page: Page) {
  await page.route("**/api/catalog?*", (route) => json(route, catalogFixture(route.request().url())));
  await page.route("**/api/recipes?*", (route) => json(route, recipeListFixture(route.request().url())));
  await page.route(/\/api\/products\/[^/?]+(?:\?|$)/, (route) => json(route, productDetailFixture(route.request().url())));
  await page.route(/\/api\/recipes\/[^/?]+(?:\?|$)/, (route) => json(route, recipeDetailFixture(route.request().url())));
}

function localizedRecipes(english: boolean) {
  return publishedRecipes.map((recipe) => ({
    ...recipe,
    title: english ? recipe.titleEn : recipe.titleFr,
    description: english ? recipe.descriptionEn : recipe.descriptionFr,
  }));
}

function json(route: Parameters<Parameters<Page["route"]>[1]>[0], payload: unknown) {
  return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(payload) });
}
