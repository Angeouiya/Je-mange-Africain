export type SearchCollection = "products" | "recipes" | "library";

export type SearchResultCounts = {
  products: number;
  recipes: number;
  dishes: number;
};

export function preferredSearchCollection(counts: SearchResultCounts): SearchCollection {
  if (counts.products > 0) return "products";
  if (counts.recipes > 0) return "recipes";
  if (counts.dishes > 0) return "library";
  return "products";
}

export function kitchenResultCount(counts: SearchResultCounts) {
  return Math.max(0, counts.recipes) + Math.max(0, counts.dishes);
}

