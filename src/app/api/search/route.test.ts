import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  aliasFindMany: vi.fn(),
  productFindMany: vi.fn(),
  recipeFindMany: vi.fn(),
  enforceRateLimit: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    productAlias: { findMany: mocks.aliasFindMany },
    product: { findMany: mocks.productFindMany },
    recipe: { findMany: mocks.recipeFindMany },
  },
}));
vi.mock("@/lib/redis", () => ({ enforceRateLimit: mocks.enforceRateLimit }));
vi.mock("@/lib/dish-library", () => ({ localizeDish: vi.fn(), searchDishLibrary: () => [] }));
vi.mock("@/lib/market-media", () => ({ getProductPhoto: () => "/products/fallback.webp", getRecipePhoto: () => "/recipes/fallback.webp" }));

import { GET } from "./route";

describe("GET /api/search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.enforceRateLimit.mockResolvedValue(null);
    mocks.aliasFindMany.mockResolvedValue([]);
    mocks.productFindMany.mockResolvedValue([]);
    mocks.recipeFindMany.mockResolvedValue([]);
  });

  it("keeps product and recipe publication boundaries distinct", async () => {
    const response = await GET(new NextRequest("http://localhost/api/search?q=attieke&locale=fr"));

    expect(response.status).toBe(200);
    expect(mocks.productFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: "published" }),
    }));
    expect(mocks.recipeFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        status: "published",
        ingredients: {
          some: { optional: false },
          none: { product: { status: { not: "published" } } },
        },
      }),
    }));
  });
});
