export const PUBLIC_RECIPE_WHERE = {
  status: "published",
  ingredients: {
    some: { optional: false },
    none: { product: { status: { not: "published" } } },
  },
} as const;

type ProductPublicationState = {
  id: string;
  status?: string | null;
};

export function unpublishedRecipeProductIds(
  productIds: Iterable<string>,
  products: ReadonlyArray<ProductPublicationState>,
) {
  const statusById = new Map(products.map((product) => [product.id, product.status]));
  return Array.from(new Set(productIds)).filter((productId) => statusById.get(productId) !== "published");
}

export function hasRequiredRecipeIngredient(ingredients: Iterable<{ optional?: boolean }>) {
  return Array.from(ingredients).some((ingredient) => !ingredient.optional);
}

export function recipePublicationConflict(unpublishedProductIds: string[], missingRequiredIngredient = false, locale: "fr" | "en" = "fr") {
  if (missingRequiredIngredient) {
    return {
      error: locale === "fr"
        ? "Publication impossible : reliez au moins un ingrédient obligatoire à un produit publié."
        : "Unable to publish: link at least one required ingredient to a published product.",
      unpublishedProductIds,
    };
  }
  const multiple = unpublishedProductIds.length > 1;
  return {
    error: locale === "fr"
      ? `Publication impossible : ${multiple ? "certains produits utilisés comme ingrédients sont encore en brouillon ou désactivés" : "un produit utilisé comme ingrédient est encore en brouillon ou désactivé"}. Publiez d'abord ${multiple ? "ces produits" : "ce produit"}.`
      : `Unable to publish: ${multiple ? "some products used as ingredients are still drafts or disabled" : "a product used as an ingredient is still a draft or disabled"}. Publish ${multiple ? "these products" : "this product"} first.`,
    unpublishedProductIds,
  };
}
