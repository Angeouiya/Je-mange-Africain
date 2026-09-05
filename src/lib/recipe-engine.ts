// Intelligent recipe engine for « Je mange Africain ».
// Computes quantities, packaging, leftovers, costs and substitutions
// for a recipe scaled to the requested number of people.

import type { Locale } from "./i18n";

export type ThermalClass = "AMBIANT" | "REFRIGERATED" | "FROZEN";

export interface RecipeConfigInput {
  servings: number;
  adults: number;
  children: number;
  portion: "normal" | "generous";
  protein?: "recipe" | "meat" | "fish" | "none";
  kplo: boolean;
  spiceLevel: "mild" | "medium" | "hot" | "veryHot";
  allergies?: string;
  budget?: number;
  formula: "economy" | "standard" | "premium";
  haveAtHome: string[]; // recipe ingredient IDs or product IDs already in the pantry
  excludedIngredients?: string[]; // recipe ingredient IDs deliberately removed
  replacements?: Record<string, string>; // recipe ingredient ID -> replacement product ID
}

export interface IngredientReplacementOption {
  productId: string;
  nameFr: string;
  nameEn: string;
  emoji: string;
  imageUrl?: string | null;
  availableStock: number;
  packLabel: string;
  unitPrice: number;
}

export interface EngineIngredient {
  recipeIngredientId: string;
  productId: string;
  variantId: string;
  nameFr: string;
  nameEn: string;
  traditionalName: string;
  emoji: string;
  imageUrl?: string | null;
  color: string;
  role: string;
  optional: boolean;
  neededQty: number; // in neededUnit
  neededUnit: string; // g | ml | piece | tbsp | tsp
  boughtQty: number; // in grams/ml/piece
  boughtLabel: string; // "2 boîtes" / "1 sachet"
  packs: number;
  packLabel: string; // variant label
  packWeightGrams: number;
  leftover: number; // leftover in neededUnit
  leftoverUnit: "g" | "ml" | "piece";
  unitPrice: number;
  lineTotal: number;
  available: boolean;
  stockQty: number;
  thermalClass: ThermalClass;
  removed: boolean;
  removalReason: "pantry" | "excluded" | "protein-none" | null;
  originalProductId: string;
  originalNameFr: string;
  originalNameEn: string;
  isReplacement: boolean;
  replacementOptions: IngredientReplacementOption[];
  substituteProductId?: string | null;
  substituteName?: string | null;
}

export interface EngineResult {
  recipeId: string;
  servings: number;
  adults: number;
  children: number;
  portion: string;
  formula: string;
  ingredients: EngineIngredient[];
  totalCost: number;
  costPerPerson: number;
  totalWeightGrams: number;
  thermalSplit: ThermalClass[];
  packageCount: number;
  steps: { fr: string[]; en: string[] };
  stepSourceIndexes: { fr: number[]; en: number[] };
  unavailableCount: number;
  leftoverCount: number;
}

/* Unit conversion helpers */
const TbspGrams = 15; // approximate for pastes/powders
const TspGrams = 5;

/** Convert a quantity in `fromUnit` to grams (or ml for liquids, or piece). */
function toBaseUnit(qty: number, fromUnit: string, isLiquid: boolean): number {
  switch (fromUnit) {
    case "kg": return qty * 1000;
    case "L": return qty * 1000; // ml
    case "g": return qty;
    case "ml": return qty;
    case "tbsp": return qty * TbspGrams;
    case "tsp": return qty * TspGrams;
    case "piece": return qty;
    default: return qty;
  }
}

/** Format a quantity+unit for display (localized). */
export function formatQty(qty: number, unit: string, locale: Locale): string {
  if (unit === "piece") {
    const n = Math.round(qty * 10) / 10;
    const label = n >= 2 ? (locale === "en" ? "pcs" : "pièces") : (locale === "en" ? "pc" : "pièce");
    return `${n} ${label}`;
  }
  if (unit === "kg" || unit === "L") {
    const v = Math.round(qty * 100) / 100;
    return `${v.toString().replace(".", ",")} ${unit}`;
  }
  if (qty >= 1000) {
    const v = Math.round((qty / 1000) * 100) / 100;
    return `${v.toString().replace(".", ",")} ${unit === "ml" ? "L" : "kg"}`;
  }
  return `${Math.round(qty)} ${unit}`;
}

/** Round packs up so bought >= needed. */
function computePacks(neededBase: number, packWeight: number): number {
  if (packWeight <= 0 || neededBase <= 0) return neededBase > 0 ? 1 : 0;
  return Math.ceil(neededBase / packWeight);
}

interface RawIngredient {
  ri: {
    id: string;
    quantityPerBase: number;
    unit: string;
    role: string;
    optional: boolean;
    alternatives: string | null;
    note: string | null;
  };
  product: {
    id: string;
    traditionalName: string;
    imageEmoji: string;
    imageUrl?: string | null;
    imageColor: string;
    thermalClass: string;
    stockQty: number;
    reservedQty: number;
    categoryId: string;
    categorySlug: string;
    translations: { locale: string; name: string }[];
  };
  variants: {
    id: string;
    label: string;
    weightGrams: number;
    volumeMl: number;
    price: number;
    isDefault: boolean;
  }[];
}

interface SubstituteProduct {
  id: string;
  traditionalName: string;
  imageEmoji: string;
  imageUrl?: string | null;
  imageColor: string;
  thermalClass: string;
  stockQty: number;
  reservedQty: number;
  categoryId: string;
  categorySlug: string;
  translations: { locale: string; name: string }[];
  variants: RawIngredient["variants"];
}

interface RecipeCtx {
  recipeId: string;
  baseServings: number;
  steps: { fr: string[]; en: string[] };
  rawIngredients: RawIngredient[];
  allProductsForSubstitute: SubstituteProduct[];
}

const availableStock = (product: { stockQty: number; reservedQty: number }) => Math.max(0, product.stockQty - product.reservedQty);

function productNames(product: { traditionalName: string; translations: { locale: string; name: string }[] }) {
  return {
    fr: product.translations.find((translation) => translation.locale === "fr")?.name || product.traditionalName,
    en: product.translations.find((translation) => translation.locale === "en")?.name || product.traditionalName,
  };
}

function proteinKind(product: { traditionalName: string; categorySlug: string }): "fish" | "meat" | "other" {
  const value = `${product.categorySlug} ${product.traditionalName}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (/poisson|fish|tilapia|maquereau|thon|capitaine|crevette/.test(value)) return "fish";
  if (/viande|meat|poulet|boeuf|agneau|mouton|kplo|tripe|chevre/.test(value)) return "meat";
  return "other";
}

function normalizedProductName(product: { traditionalName: string; translations: { locale: string; name: string }[] }) {
  return `${product.traditionalName} ${product.translations.map((translation) => translation.name).join(" ")}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function isCompatibleReplacement(role: string, original: { categoryId: string }, candidate: SubstituteProduct) {
  const name = normalizedProductName(candidate);
  if (role === "protein") return proteinKind(candidate) !== "other";
  if (role === "fat") return /huile|oil|beurre|butter|graisse/.test(name);
  if (role === "spice") return /piment|chili|poivre|pepper|epice|spice|gingembre|ginger/.test(name);
  if (role === "aromatic") return /tomate|tomato|oignon|onion|ail|garlic|gingembre|ginger|bouillon|soumbala|akpi/.test(name);
  return candidate.categoryId === original.categoryId;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchInitialCase(source: string, replacement: string, locale: Locale) {
  const sourceLetter = source.match(/\p{L}/u)?.[0];
  const replacementLetterIndex = replacement.search(/\p{L}/u);
  if (!sourceLetter || replacementLetterIndex < 0) return replacement;
  const replacementLetter = replacement[replacementLetterIndex];
  const casedLetter = sourceLetter === sourceLetter.toLocaleUpperCase(locale)
    ? replacementLetter.toLocaleUpperCase(locale)
    : replacementLetter.toLocaleLowerCase(locale);
  return `${replacement.slice(0, replacementLetterIndex)}${casedLetter}${replacement.slice(replacementLetterIndex + 1)}`;
}

function replaceIngredientInStep(step: string, originalName: string, replacementName: string, locale: Locale) {
  const original = originalName.trim();
  const replacement = replacementName.trim();
  if (!original || !replacement) return step;

  const replaced = step.replace(new RegExp(escapeRegExp(original), "giu"), (match) => matchInitialCase(match, replacement, locale));
  if (locale !== "fr") return replaced;

  const startsWithVowel = "(?=[aàâäeéèêëiîïoôöuùûüy])";
  return replaced
    .replace(new RegExp(`\\b(?:la|le)\\s+${startsWithVowel}`, "giu"), "l’")
    .replace(new RegExp(`\\bdu\\s+${startsWithVowel}`, "giu"), "de l’")
    .replace(new RegExp(`\\bau\\s+${startsWithVowel}`, "giu"), "à l’");
}

function adaptRecipeSteps(steps: string[], ingredients: EngineIngredient[], locale: Locale) {
  const replacements = ingredients.filter((ingredient) => ingredient.isReplacement);
  const removedNames = ingredients
    .filter((ingredient) => ingredient.removalReason === "excluded" || ingredient.removalReason === "protein-none")
    .flatMap((ingredient) => locale === "fr"
      ? [ingredient.originalNameFr, ingredient.nameFr]
      : [ingredient.originalNameEn, ingredient.nameEn])
    .filter(Boolean);

  return steps
    .map((step, sourceIndex) => ({
      sourceIndex,
      instruction: replacements.reduce((adapted, ingredient) => replaceIngredientInStep(
        adapted,
        locale === "fr" ? ingredient.originalNameFr : ingredient.originalNameEn,
        locale === "fr" ? ingredient.nameFr : ingredient.nameEn,
        locale,
      ), step),
    }))
    .filter((step) => !removedNames.some((name) => new RegExp(escapeRegExp(name), "iu").test(step.instruction)));
}

export function computeRecipe(input: RecipeConfigInput, ctx: RecipeCtx): EngineResult {
  const { recipeId, baseServings, steps, rawIngredients, allProductsForSubstitute } = ctx;

  // effective servings: children count as 0.6 adult
  const effectiveServings = (input.adults || input.servings) + (input.children || 0) * 0.6;
  const portionFactor = input.portion === "generous" ? 1.25 : 1;
  const scale = (effectiveServings / baseServings) * portionFactor;

  // spice factor
  const spiceFactor = input.spiceLevel === "mild" ? 0.5 : input.spiceLevel === "medium" ? 1 : input.spiceLevel === "hot" ? 1.5 : 2;

  // Build ingredient list, possibly injecting kplô
  let working = [...rawIngredients];
  if (input.kplo) {
    const hasKplo = rawIngredients.some((r) => r.product.traditionalName.toLowerCase().includes("kpl"));
    if (!hasKplo) {
      // find kplo product in substitutes pool
      const kploSub = allProductsForSubstitute.find((p) => p.traditionalName.toLowerCase().includes("kpl"));
      if (kploSub) {
        working.push({
          ri: {
            id: "injected-kplo",
            quantityPerBase: 100, // ~100g per 4 servings
            unit: "g",
            role: "protein",
            optional: true,
            alternatives: null,
            note: "Ajouté (kplô)",
          },
          product: {
            id: kploSub.id,
            traditionalName: kploSub.traditionalName,
            imageEmoji: kploSub.imageEmoji,
            imageUrl: kploSub.imageUrl,
            imageColor: kploSub.imageColor,
            thermalClass: kploSub.thermalClass,
            stockQty: kploSub.stockQty,
            reservedQty: kploSub.reservedQty,
            categoryId: kploSub.categoryId,
            categorySlug: kploSub.categorySlug,
            translations: kploSub.translations,
          },
          variants: kploSub.variants,
        } as RawIngredient);
      }
    }
  }
  // inject fresh chili if spice >= hot and not present
  if ((input.spiceLevel === "hot" || input.spiceLevel === "veryHot") && !working.some((r) => r.product.traditionalName.toLowerCase().includes("piment frais"))) {
    const chiliSub = allProductsForSubstitute.find((p) => p.traditionalName.toLowerCase().includes("piment frais"));
    if (chiliSub) {
      working.push({
        ri: { id: "injected-chili", quantityPerBase: 15, unit: "g", role: "spice", optional: true, alternatives: null, note: "Piment frais ajouté" },
        product: {
          id: chiliSub.id, traditionalName: chiliSub.traditionalName, imageEmoji: chiliSub.imageEmoji, imageUrl: chiliSub.imageUrl, imageColor: chiliSub.imageColor,
          thermalClass: chiliSub.thermalClass, stockQty: chiliSub.stockQty, reservedQty: chiliSub.reservedQty, categoryId: chiliSub.categoryId, categorySlug: chiliSub.categorySlug,
          translations: chiliSub.translations,
        },
        variants: chiliSub.variants,
      } as RawIngredient);
    }
  }

  const ingredients: EngineIngredient[] = [];
  for (const w of working) {
    const { ri } = w;
    const originalProduct = w.product;
    const originalVariants = w.variants;
    const originalNames = productNames(originalProduct);

    let alternativeIds: string[] = [];
    try { alternativeIds = ri.alternatives ? JSON.parse(ri.alternatives) : []; } catch {}

    const replacementCandidates = [
      ...alternativeIds.map((id) => allProductsForSubstitute.find((product) => product.id === id)),
      ...allProductsForSubstitute.filter((product) => isCompatibleReplacement(ri.role, originalProduct, product)),
    ].filter((product): product is SubstituteProduct => Boolean(product && product.id !== originalProduct.id && isCompatibleReplacement(ri.role, originalProduct, product)));
    const uniqueCandidates = Array.from(new Map(replacementCandidates.map((product) => [product.id, product])).values())
      .sort((a, b) => availableStock(b) - availableStock(a))
      .slice(0, 8);

    const hasExplicitReplacement = Object.prototype.hasOwnProperty.call(input.replacements || {}, ri.id);
    let selectedCandidate = hasExplicitReplacement
      ? allProductsForSubstitute.find((product) => product.id === input.replacements?.[ri.id])
      : undefined;

    if (!hasExplicitReplacement && ri.role === "protein" && input.protein && input.protein !== "recipe" && input.protein !== "none" && proteinKind(originalProduct) !== input.protein) {
      selectedCandidate = allProductsForSubstitute.find((product) => proteinKind(product) === input.protein && availableStock(product) > 0);
    }

    const product = selectedCandidate || originalProduct;
    const variants = selectedCandidate?.variants || originalVariants;
    const names = productNames(product);

    let effScale = scale;
    if (ri.role === "spice") effScale = scale * spiceFactor;

    const deliberatelyExcluded = Boolean(input.excludedIngredients?.includes(ri.id));
    const proteinRemoved = ri.role === "protein" && input.protein === "none";
    const pantryRemoved = input.haveAtHome.includes(ri.id) || input.haveAtHome.includes(product.id);
    const removalReason = deliberatelyExcluded ? "excluded" : proteinRemoved ? "protein-none" : pantryRemoved ? "pantry" : null;
    const removed = removalReason !== null;

    // needed qty in the ri unit
    let neededQty = ri.quantityPerBase * effScale;
    // convert to a base unit (grams or ml or piece) for packaging math
    const isLiquid = ri.unit === "ml" || ri.unit === "L";
    const neededBase = toBaseUnit(neededQty, ri.unit, isLiquid);

    const pricedVariants = [...(variants || [])].filter((variant) => variant.price >= 0);
    const variant = pricedVariants.length
      ? input.formula === "economy"
        ? pricedVariants.sort((a, b) => a.price - b.price)[0]
        : input.formula === "premium"
          ? pricedVariants.sort((a, b) => b.price - a.price)[0]
          : pricedVariants.find((item) => item.isDefault) || pricedVariants[0]
      : null;
    const packWeight = variant ? (variant.weightGrams || variant.volumeMl || 1) : (isLiquid ? 500 : 400);
    const packagingMeasure = ri.unit === "piece" ? 1 : packWeight;
    const packs = removed ? 0 : computePacks(neededBase, packagingMeasure);
    const boughtBase = packs * packWeight;
    const leftoverBase = ri.unit === "piece" ? Math.max(0, packs - neededQty) : Math.max(0, boughtBase - neededBase);
    const leftoverUnit = ri.unit === "piece" ? "piece" : (ri.unit === "ml" || ri.unit === "L" || Boolean(variant?.volumeMl)) ? "ml" : "g";

    const stockAvailable = availableStock(product);
    const available = stockAvailable >= packs && stockAvailable > 0;
    let substitute: { productId: string; name: string } | null = null;
    if (!available) {
      const sub = uniqueCandidates.find((candidate) => availableStock(candidate) > 0);
      if (sub) {
        substitute = { productId: sub.id, name: productNames(sub).fr };
      }
    }

    const unitPrice = variant ? Number(variant.price) : 0;
    const lineTotal = removed ? 0 : unitPrice * packs;

    const replacementOptions = uniqueCandidates.map((candidate) => {
      const candidateNames = productNames(candidate);
      const candidateVariant = candidate.variants.find((item) => item.isDefault) || candidate.variants[0];
      return {
        productId: candidate.id,
        nameFr: candidateNames.fr,
        nameEn: candidateNames.en,
        emoji: candidate.imageEmoji,
        imageUrl: candidate.imageUrl,
        availableStock: availableStock(candidate),
        packLabel: candidateVariant?.label || "",
        unitPrice: candidateVariant?.price || 0,
      };
    });

    ingredients.push({
      recipeIngredientId: ri.id,
      productId: product.id,
      variantId: variant?.id || "",
      nameFr: names.fr,
      nameEn: names.en,
      traditionalName: product.traditionalName,
      emoji: product.imageEmoji,
      imageUrl: product.imageUrl,
      color: product.imageColor,
      role: ri.role,
      optional: ri.optional,
      neededQty: Math.round(neededQty * 100) / 100,
      neededUnit: ri.unit,
      boughtQty: removed ? 0 : boughtBase,
      boughtLabel: variant ? `${packs} × ${variant.label}` : `${packs} × ${packWeight} g`,
      packs,
      packLabel: variant?.label || `${packWeight} g`,
      packWeightGrams: packWeight,
      leftover: removed ? 0 : Math.round(leftoverBase * 100) / 100,
      leftoverUnit,
      unitPrice,
      lineTotal,
      available,
      stockQty: stockAvailable,
      thermalClass: product.thermalClass as ThermalClass,
      removed,
      removalReason,
      originalProductId: originalProduct.id,
      originalNameFr: originalNames.fr,
      originalNameEn: originalNames.en,
      isReplacement: product.id !== originalProduct.id,
      replacementOptions,
      substituteProductId: substitute?.productId || null,
      substituteName: substitute?.name || null,
    });
  }

  const totalCost = ingredients.reduce((s, i) => s + (i.removed ? 0 : i.lineTotal), 0);
  const totalWeightGrams = ingredients.reduce((s, i) => s + (i.removed ? 0 : i.boughtQty), 0);
  const thermalSet = new Set<ThermalClass>();
  ingredients.forEach((i) => { if (!i.removed && i.packs > 0) thermalSet.add(i.thermalClass); });
  const thermalSplit = Array.from(thermalSet);
  const costPerPerson = input.servings > 0 ? totalCost / input.servings : totalCost;
  const unavailableCount = ingredients.filter((i) => !i.available && !i.removed).length;
  const leftoverCount = ingredients.filter((i) => i.leftover > 0 && !i.removed).length;
  const frenchSteps = adaptRecipeSteps(steps.fr, ingredients, "fr");
  const englishSteps = adaptRecipeSteps(steps.en, ingredients, "en");
  const adaptedSteps = { fr: frenchSteps.map((step) => step.instruction), en: englishSteps.map((step) => step.instruction) };

  return {
    recipeId,
    servings: input.servings,
    adults: input.adults,
    children: input.children,
    portion: input.portion,
    formula: input.formula,
    ingredients,
    totalCost: Math.round(totalCost * 100) / 100,
    costPerPerson: Math.round(costPerPerson * 100) / 100,
    totalWeightGrams: Math.round(totalWeightGrams),
    thermalSplit,
    packageCount: thermalSplit.length || 1,
    steps: adaptedSteps,
    stepSourceIndexes: { fr: frenchSteps.map((step) => step.sourceIndex), en: englishSteps.map((step) => step.sourceIndex) },
    unavailableCount,
    leftoverCount,
  };
}
