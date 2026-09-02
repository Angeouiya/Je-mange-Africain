export type WholesaleTier = { minPacks: number; price: number };

export function wholesaleTiers(product: {
  wholesaleMinPacks?: number | null;
  wholesalePrice?: number | null;
  wholesaleTier2MinPacks?: number | null;
  wholesaleTier2Price?: number | null;
  wholesaleTier3MinPacks?: number | null;
  wholesaleTier3Price?: number | null;
}): WholesaleTier[] {
  const tiers = [
    { minPacks: product.wholesaleMinPacks, price: product.wholesalePrice },
    { minPacks: product.wholesaleTier2MinPacks, price: product.wholesaleTier2Price },
    { minPacks: product.wholesaleTier3MinPacks, price: product.wholesaleTier3Price },
  ];
  return tiers
    .filter((tier): tier is { minPacks: number; price: number } => Number.isInteger(tier.minPacks) && Number(tier.minPacks) > 0 && Number(tier.price) > 0)
    .map((tier) => ({ minPacks: Number(tier.minPacks), price: Number(tier.price) }))
    .sort((a, b) => a.minPacks - b.minPacks);
}

export function wholesalePriceForQuantity(tiers: WholesaleTier[], quantity: number) {
  return tiers.reduce((price, tier) => quantity >= tier.minPacks ? tier.price : price, tiers[0]?.price || 0);
}

export function wholesaleAvailablePacks(stockQty: number, reservedQty: number, unitsPerPack: number) {
  return Math.floor(Math.max(0, stockQty - reservedQty) / Math.max(1, unitsPerPack));
}

export function wholesaleDiscountPercent(retailPrice: number, unitsPerPack: number, wholesalePrice: number) {
  const retailPackPrice = retailPrice * Math.max(1, unitsPerPack);
  if (retailPackPrice <= 0 || wholesalePrice >= retailPackPrice) return 0;
  return Math.round((1 - wholesalePrice / retailPackPrice) * 100);
}
