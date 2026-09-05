import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  productFindMany: vi.fn(),
  productCount: vi.fn(),
  categoryFindMany: vi.fn(),
  brandFindMany: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    product: { findMany: mocks.productFindMany, count: mocks.productCount },
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
});
