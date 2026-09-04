export type ProductEditorialHighlight = "bestseller" | "recommended" | "new";
export type RecipeEditorialHighlight = "popular" | "recommended" | "new";

export function productEditorialHighlight(flags: { isBestseller?: boolean; isRecommended?: boolean; isNew?: boolean }): ProductEditorialHighlight | null {
  if (flags.isBestseller) return "bestseller";
  if (flags.isRecommended) return "recommended";
  if (flags.isNew) return "new";
  return null;
}

export function recipeEditorialHighlight(flags: { isPopular?: boolean; isRecommended?: boolean; isNew?: boolean }): RecipeEditorialHighlight | null {
  if (flags.isPopular) return "popular";
  if (flags.isRecommended) return "recommended";
  if (flags.isNew) return "new";
  return null;
}
