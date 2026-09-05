import { describe, expect, it } from "vitest";
import { resolveProductPricing } from "./product-pricing";

describe("product storefront pricing", () => {
  it("applies the product promotion proportionally to a selected variant", () => {
    expect(resolveProductPricing({ price: 6, promoPrice: 4.8 }, 9.9)).toEqual({
      listPrice: 9.9,
      price: 7.92,
      saving: 1.98,
      discountPercent: 20,
      promotionalRate: 0.8,
    });
  });

  it("ignores an invalid promotion and keeps the selected variant price", () => {
    expect(resolveProductPricing({ price: 6, promoPrice: 6 }, 9.9)).toMatchObject({ price: 9.9, saving: 0, discountPercent: 0 });
  });
});
