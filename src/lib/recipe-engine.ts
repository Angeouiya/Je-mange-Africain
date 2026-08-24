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
  protein?: "meat" | "fish" | "none";
  kplo: boolean;
  spiceLevel: "mild" | "medium" | "hot" | "veryHot";
  allergies: string;
  budget?: number;
  formula: "economy" | "standard" | "premium";
  haveAtHome: string[]; // productIds already in the pantry
}

export interface EngineIngredient {
  recipeIngredientId: string;
  productId: string;
  variantId: string;
  nameFr: string;
  nameEn: string;
  traditionalName: string;
  emoji: string;
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
  unitPrice: number;
  lineTotal: number;
  available: boolean;
  stockQty: number;
  thermalClass: ThermalClass;
  removed: boolean; // marked as already-have
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
    imageColor: string;
    thermalClass: string;
    stockQty: number;
    reservedQty: number;
    categoryId: string;
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

interface RecipeCtx {
  recipeId: string;
  baseServings: number;
  steps: { fr: string[]; en: string[] };
  rawIngredients: RawIngredient[];
  allProductsForSubstitute: { id: string; traditionalName: string; stockQty: number; thermalClass: string; categoryId: string; translations: { locale: string; name: string }[] }[];
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
            imageEmoji: "🥩",
            imageColor: "#C0392B",
            thermalClass: kploSub.thermalClass,
            stockQty: kploSub.stockQty,
            reservedQty: 0,
            categoryId: kploSub.categoryId,
            translations: kploSub.translations,
          },
          variants: [], // will be fetched/simulated below
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
          id: chiliSub.id, traditionalName: chiliSub.traditionalName, imageEmoji: "🌶️", imageColor: "#C0392B",
          thermalClass: chiliSub.thermalClass, stockQty: chiliSub.stockQty, reservedQty: 0, categoryId: chiliSub.categoryId,
          translations: chiliSub.translations,
        },
        variants: [],
      } as RawIngredient);
    }
  }

  const ingredients: EngineIngredient[] = [];
  for (const w of working) {
    const { ri, product, variants } = w;

    // skip protein if user said none
    let effScale = scale;
    if (ri.role === "protein" && input.protein === "none") {
      // skip entirely
      continue;
    }
    if (ri.role === "spice") effScale = scale * spiceFactor;

    const removed = input.haveAtHome.includes(product.id);

    // needed qty in the ri unit
    let neededQty = ri.quantityPerBase * effScale;
    // convert to a base unit (grams or ml or piece) for packaging math
    const isLiquid = ri.unit === "ml" || ri.unit === "L";
    const neededBase = toBaseUnit(neededQty, ri.unit, isLiquid);

    // pick variant: default first, else first
    const variant = (variants && variants.length ? (variants.find((v) => v.isDefault) || variants[0]) : null);
    const packWeight = variant ? (variant.weightGrams || variant.volumeMl || 1) : (isLiquid ? 500 : 400);
    const packs = removed ? 0 : computePacks(neededBase, packWeight);
    const boughtBase = packs * packWeight;
    const leftoverBase = Math.max(0, boughtBase - neededBase);

    const available = product.stockQty > 0;
    let substitute: { productId: string; name: string } | null = null;
    if (!available) {
      // find substitute: alternatives JSON or sibling in same category with stock
      let altIds: string[] = [];
      try { altIds = ri.alternatives ? JSON.parse(ri.alternatives) : []; } catch {}
      let sub = altIds
        .map((id) => allProductsForSubstitute.find((p) => p.id === id))
        .find((p) => p && p.stockQty > 0);
      if (!sub) {
        sub = allProductsForSubstitute.find((p) => p.categoryId === product.categoryId && p.id !== product.id && p.stockQty > 0);
      }
      if (sub) {
        const name = sub.translations.find((t) => t.locale === "fr")?.name || sub.traditionalName;
        substitute = { productId: sub.id, name };
      }
    }

    const unitPrice = variant ? Number(variant.price) : 0;
    const lineTotal = unitPrice * packs;

    const nameFr = product.translations.find((t) => t.locale === "fr")?.name || product.traditionalName;
    const nameEn = product.translations.find((t) => t.locale === "en")?.name || product.traditionalName;

    ingredients.push({
      recipeIngredientId: ri.id,
      productId: product.id,
      variantId: variant?.id || "",
      nameFr,
      nameEn,
      traditionalName: product.traditionalName,
      emoji: product.imageEmoji,
      color: product.imageColor,
      role: ri.role,
      optional: ri.optional,
      neededQty: Math.round(neededQty * 100) / 100,
      neededUnit: ri.unit,
      boughtQty: boughtBase,
      boughtLabel: variant ? `${packs} × ${variant.label}` : `${packs} × ${packWeight} g`,
      packs,
      packLabel: variant?.label || `${packWeight} g`,
      packWeightGrams: packWeight,
      leftover: Math.round(leftoverBase * 100) / 100,
      unitPrice,
      lineTotal,
      available,
      stockQty: product.stockQty,
      thermalClass: product.thermalClass as ThermalClass,
      removed,
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
    steps,
    unavailableCount,
    leftoverCount,
  };
}
