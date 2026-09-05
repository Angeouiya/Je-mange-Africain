type Locale = "fr" | "en";

export type StepIngredientReference = {
  recipeIngredientId?: string;
  productId?: string;
  originalProductId?: string;
  name?: string;
  nameFr?: string;
  nameEn?: string;
  originalNameFr?: string;
  originalNameEn?: string;
  removalReason?: string | null;
};

const GENERIC_TERMS = new Set([
  "avec", "dans", "pour", "puis", "sans", "frais", "fraiche", "fraiches", "frais", "entier", "entiere",
  "with", "into", "then", "fresh", "whole", "large", "small", "pieces", "morceaux", "prepare", "preparation",
]);

const normalize = (value: string) => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

function ingredientSignals(ingredient: StepIngredientReference, locale: Locale) {
  const names = locale === "fr"
    ? [ingredient.nameFr, ingredient.originalNameFr, ingredient.name]
    : [ingredient.nameEn, ingredient.originalNameEn, ingredient.name];
  const normalizedNames = names.map((name) => normalize(name || "")).filter(Boolean);
  const terms = normalizedNames
    .flatMap((name) => name.split(" "))
    .filter((term) => term.length >= 4 && !GENERIC_TERMS.has(term));
  return { names: normalizedNames, terms: Array.from(new Set(terms)) };
}

export function ingredientsForPreparationStep<T extends StepIngredientReference>(instruction: string, ingredients: T[], locale: Locale, explicitProductIds: string[] = []): T[] {
  const step = normalize(instruction);
  if (!step) return [];
  const selectedProductIds = new Set(explicitProductIds);
  return ingredients.filter((ingredient) => {
    if (ingredient.removalReason === "excluded" || ingredient.removalReason === "protein-none") return false;
    const productId = ingredient.productId;
    const originalProductId = ingredient.originalProductId;
    if (selectedProductIds.size > 0) return Boolean((productId && selectedProductIds.has(productId)) || (originalProductId && selectedProductIds.has(originalProductId)));
    const signals = ingredientSignals(ingredient, locale);
    return signals.names.some((name) => name.length >= 4 && step.includes(name))
      || signals.terms.some((term) => step.split(" ").includes(term));
  });
}
