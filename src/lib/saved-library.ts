const MAX_SAVED_ITEMS = 200;

export type SavedLibrary = {
  productIds: string[];
  recipeIds: string[];
};

export function normalizeSavedIds(ids: string[]) {
  return Array.from(new Set(ids.filter(Boolean))).slice(0, MAX_SAVED_ITEMS);
}

export function reconcileSavedLibrary({
  remote,
  local,
  ownedByCurrentCustomer,
  preservePendingChanges,
}: {
  remote: SavedLibrary;
  local: SavedLibrary;
  ownedByCurrentCustomer: boolean;
  preservePendingChanges: boolean;
}) {
  const remoteProducts = normalizeSavedIds(remote.productIds);
  const remoteRecipes = normalizeSavedIds(remote.recipeIds);
  const remoteProductSet = new Set(remoteProducts);
  const remoteRecipeSet = new Set(remoteRecipes);
  const productIds = preservePendingChanges
    ? normalizeSavedIds(local.productIds)
    : ownedByCurrentCustomer
      ? remoteProducts
      : normalizeSavedIds([...remoteProducts, ...local.productIds]);
  const recipeIds = preservePendingChanges
    ? normalizeSavedIds(local.recipeIds)
    : ownedByCurrentCustomer
      ? remoteRecipes
      : normalizeSavedIds([...remoteRecipes, ...local.recipeIds]);
  const needsServerSync = preservePendingChanges || (!ownedByCurrentCustomer && (
    productIds.some((id) => !remoteProductSet.has(id)) || recipeIds.some((id) => !remoteRecipeSet.has(id))
  ));

  return { productIds, recipeIds, needsServerSync };
}
