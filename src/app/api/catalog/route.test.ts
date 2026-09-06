import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  productFindMany: vi.fn(),
  productCount: vi.fn(),
  categoryFindMany: vi.fn(),
  brandFindMany: vi.fn(),
  productReservedQtyField: { _ref: "Product.reservedQty" },
}));

vi.mock("@/lib/db", () => ({
  db: {
    product: { findMany: mocks.productFindMany, count: mocks.productCount, fields: { reservedQty: mocks.productReservedQtyField } },
    category: { findMany: mocks.categoryFindMany },
    brand: { findMany: mocks.brandFindMany },
  },
}));
vi.mock("@/lib/market-media", () => ({ getProductPhoto: () => "/products/attieke.webp", getRecipePhoto: () => "/recipes/fallback.webp" }));

import { GET } from "./route";

describe("GET /api/catalog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.productCount.mockResolvedValue(1);
    mocks.categoryFindMany.mockResolvedValue([]);
    mocks.brandFindMany.mockResolvedValue([]);
    mocks.productFindMany
      .mockResolvedValueOnce([{
        id: "product-1",
        sku: "JMA-ATT-500",
        barcode: null,
        traditionalName: "Attiéké",
        translations: [{ locale: "fr", name: "Attiéké frais", description: "Semoule de manioc fraîche." }],
        country: "Côte d'Ivoire",
        thermalClass: "REFRIGERATED",
        storageType: "REFRIGERE",
        storageTempC: "4°C",
        netWeightGrams: 500,
        volumeMl: null,
        unit: "piece",
        packaging: "Sachet 500 g",
        price: 4.9,
        promoPrice: null,
        pricePerKg: 9.8,
        isWholesale: false,
        wholesaleUnitsPerPack: 1,
        stockQty: 9,
        reservedQty: 9,
        alertThreshold: 3,
        imageColor: "#F2A900",
        imageEmoji: "",
        imageUrl: "/products/attieke.webp",
        isBestseller: true,
        isNew: false,
        isRecommended: false,
        isOnSale: false,
        categoryId: "cat-1",
        brandId: null,
        brand: null,
        category: { id: "cat-1", slug: "feculents", nameFr: "Féculents", nameEn: "Staples", color: "#D65A32" },
        variants: [],
      }])
      .mockResolvedValueOnce([{ country: "Côte d'Ivoire" }]);
  });

  it("publishes sellable stock after customer reservations", async () => {
    const response = await GET(new NextRequest("http://localhost/api/catalog?locale=fr"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.products[0]).toMatchObject({ id: "product-1", stockQty: 0 });
    expect(payload.products[0]).not.toHaveProperty("reservedQty");
  });

  it("applies quick selection filters before projecting storefront products", async () => {
    const response = await GET(new NextRequest("http://localhost/api/catalog?locale=fr&highlight=available&q=attieke"));
    const payload = await response.json();
    const where = mocks.productCount.mock.calls[0]?.[0]?.where;

    expect(response.status).toBe(200);
    expect(payload.total).toBe(1);
    expect(where.status).toBe("published");
    expect(where.AND).toEqual(expect.arrayContaining([
      { stockQty: { gt: mocks.productReservedQtyField } },
      expect.objectContaining({ OR: expect.any(Array) }),
    ]));
  });

  it("reflects admin recommendation flags in the catalogue query", async () => {
    const response = await GET(new NextRequest("http://localhost/api/catalog?locale=fr&highlight=recommended"));
    const where = mocks.productCount.mock.calls[0]?.[0]?.where;

    expect(response.status).toBe(200);
    expect(where).toMatchObject({ status: "published", isRecommended: true });
  });
});
