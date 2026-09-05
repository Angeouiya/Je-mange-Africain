export type ProductPricingInput = {
  price: number;
  promoPrice?: number | null;
};

const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function resolveProductPricing(product: ProductPricingInput, variantPrice?: number | null) {
  const baseListPrice = Math.max(0, Number(product.price) || 0);
  const listPrice = Math.max(0, Number(variantPrice ?? baseListPrice) || 0);
  const promoPrice = product.promoPrice === null || product.promoPrice === undefined ? null : Number(product.promoPrice);
  const promotionalRate = promoPrice !== null && promoPrice > 0 && promoPrice < baseListPrice && baseListPrice > 0
    ? Math.round((promoPrice / baseListPrice) * 1_000_000) / 1_000_000
    : 1;
  const price = roundMoney(listPrice * promotionalRate);
  const saving = roundMoney(Math.max(0, listPrice - price));
  const discountPercent = listPrice > 0 && saving > 0 ? Math.round((saving / listPrice) * 100) : 0;

  return { listPrice, price, saving, discountPercent, promotionalRate };
}
