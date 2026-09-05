import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  enforceRateLimit: vi.fn(),
  promotionFindUnique: vi.fn(),
  productFindMany: vi.fn(),
}));

vi.mock("@/lib/redis", () => ({ enforceRateLimit: mocks.enforceRateLimit }));
vi.mock("@/lib/db", () => ({
  db: {
    promotion: { findUnique: mocks.promotionFindUnique },
    product: { findMany: mocks.productFindMany },
  },
}));

import { POST } from "./route";

const request = (body: Record<string, unknown>) => new NextRequest("http://localhost/api/promotions/validate", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

const promotion = {
  code: "EPICES15",
  type: "percent",
  value: 15,
  minOrder: 30,
  appliesTo: "category",
  targetId: "category-spices",
  startsAt: null,
  endsAt: null,
  usageLimit: 100,
  usedCount: 12,
  active: true,
};

describe("POST /api/promotions/validate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.enforceRateLimit.mockResolvedValue(null);
    mocks.promotionFindUnique.mockResolvedValue(promotion);
    mocks.productFindMany.mockResolvedValue([
      { id: "product-akpi", categoryId: "category-spices" },
      { id: "product-attieke", categoryId: "category-staples" },
    ]);
  });

  it("discounts only lines in the targeted category", async () => {
    const response = await POST(request({
      code: "epices15",
      subtotal: 50,
      country: "France",
      locale: "fr",
      items: [
        { productId: "product-akpi", lineTotal: 20 },
        { productId: "product-attieke", lineTotal: 30 },
      ],
    }));

    await expect(response.json()).resolves.toMatchObject({ valid: true, code: "EPICES15", discount: 3, eligibleSubtotal: 20, lifecycle: "active" });
    expect(mocks.productFindMany).toHaveBeenCalledWith({
      where: { id: { in: ["product-akpi", "product-attieke"] } },
      select: { id: true, categoryId: true },
    });
  });

  it("returns a localized refusal when the usage limit is exhausted", async () => {
    mocks.promotionFindUnique.mockResolvedValue({ ...promotion, usageLimit: 12, usedCount: 12 });

    const response = await POST(request({ code: "EPICES15", subtotal: 50, locale: "en", items: [] }));

    await expect(response.json()).resolves.toMatchObject({ valid: false, lifecycle: "exhausted", error: "This promotion has reached its usage limit." });
    expect(mocks.productFindMany).not.toHaveBeenCalled();
  });

  it("checks the canonical delivery country before offering free shipping", async () => {
    mocks.promotionFindUnique.mockResolvedValue({ ...promotion, type: "free_shipping", value: 0, appliesTo: "country", targetId: "France" });

    const response = await POST(request({ code: "EPICES15", subtotal: 50, country: "Belgique", locale: "fr", items: [] }));

    await expect(response.json()).resolves.toMatchObject({ valid: false, freeShipping: false, error: "Ce code ne s'applique pas à cette sélection." });
  });
});
