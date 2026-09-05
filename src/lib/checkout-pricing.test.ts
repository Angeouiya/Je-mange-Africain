import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  productFindMany: vi.fn(),
  promotionFindUnique: vi.fn(),
  calculateShippingQuote: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    product: { findMany: mocks.productFindMany },
    promotion: { findUnique: mocks.promotionFindUnique },
  },
}));

vi.mock("@/lib/shipping", () => ({
  calculateShippingQuote: mocks.calculateShippingQuote,
}));

import { CheckoutPricingError, priceCheckout } from "./checkout-pricing";

const product = {
  id: "product-attieke",
  categoryId: "category-staples",
  traditionalName: "Attiéké",
  sku: "JMA-ATT-500",
  price: 6,
  promoPrice: 4.8,
  stockQty: 40,
  reservedQty: 4,
  netWeightGrams: 500,
  thermalClass: "REFRIGERATED",
  imageUrl: "/products/attieke.webp",
  packaging: "Sachet 500 g",
  isWholesale: false,
  wholesalePackLabel: null,
  wholesaleUnitsPerPack: 1,
  wholesaleMinPacks: 1,
  wholesalePrice: null,
  wholesaleTier2MinPacks: null,
  wholesaleTier2Price: null,
  wholesaleTier3MinPacks: null,
  wholesaleTier3Price: null,
  translations: [
    { locale: "fr", name: "Attiéké frais" },
    { locale: "en", name: "Fresh attieke" },
  ],
  variants: [
    { id: "variant-500", label: "Sachet 500 g", weightGrams: 500, price: 6 },
    { id: "variant-800", label: "Pot 800 g", weightGrams: 800, price: 9.9 },
  ],
};

describe("checkout variant pricing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.productFindMany.mockResolvedValue([product]);
    mocks.promotionFindUnique.mockResolvedValue(null);
    mocks.calculateShippingQuote.mockResolvedValue({
      service: "standard",
      fee: 4,
      carrier: "Chrono Frais",
      packages: 1,
      minDelayHours: 24,
      maxDelayHours: 48,
      available: true,
      unavailableReason: null,
    });
  });

  it("prices and snapshots the exact selected format", async () => {
    const priced = await priceCheckout({
      items: [{ productId: product.id, variantId: "variant-800", qty: 2 }],
      country: "France",
      postalCode: "75011",
      deliveryService: "standard",
      locale: "fr",
    });

    expect(priced.validatedItems[0]).toMatchObject({
      productId: product.id,
      variantId: "variant-800",
      variantLabel: "Pot 800 g",
      unitPrice: 7.92,
      lineTotal: 15.84,
      packWeightGrams: 800,
    });
    expect(priced).toMatchObject({ subtotal: 15.84, weightGrams: 1600, total: 19.84 });
    expect(mocks.calculateShippingQuote).toHaveBeenCalledWith(expect.objectContaining({ weightGrams: 1600 }));
  });

  it("rejects a format that no longer belongs to the product", async () => {
    await expect(priceCheckout({
      items: [{ productId: product.id, variantId: "variant-deleted", qty: 1 }],
      country: "France",
      locale: "en",
    })).rejects.toMatchObject({ status: 409 } satisfies Partial<CheckoutPricingError>);
  });

  it("applies a product promotion only to the eligible lines", async () => {
    mocks.promotionFindUnique.mockResolvedValue({
      id: "promotion-attieke",
      type: "percent",
      value: 20,
      minOrder: 0,
      appliesTo: "product",
      targetId: product.id,
      startsAt: null,
      endsAt: null,
      usageLimit: 100,
      usedCount: 12,
      active: true,
    });

    const priced = await priceCheckout({
      items: [{ productId: product.id, qty: 2 }],
      country: "France",
      coupon: " attieke20 ",
      locale: "fr",
    });

    expect(priced).toMatchObject({ subtotal: 9.6, promoDiscount: 1.92, shipping: 4, total: 11.68, promotionId: "promotion-attieke" });
    expect(mocks.promotionFindUnique).toHaveBeenCalledWith({ where: { code: "ATTIEKE20" } });
  });

  it("refuses an exhausted category promotion without changing the order total", async () => {
    mocks.promotionFindUnique.mockResolvedValue({
      id: "promotion-category",
      type: "fixed",
      value: 4,
      minOrder: 0,
      appliesTo: "category",
      targetId: product.categoryId,
      startsAt: null,
      endsAt: null,
      usageLimit: 25,
      usedCount: 25,
      active: true,
    });

    const priced = await priceCheckout({
      items: [{ productId: product.id, qty: 2 }],
      country: "France",
      coupon: "FAMILLE4",
      locale: "fr",
    });

    expect(priced).toMatchObject({ subtotal: 9.6, promoDiscount: 0, shipping: 4, total: 13.6, promotionId: null });
  });
});
