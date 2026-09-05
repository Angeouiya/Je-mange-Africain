import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  productFindMany: vi.fn(),
  recipeFindMany: vi.fn(),
  recipeCreate: vi.fn(),
  auditCreate: vi.fn(),
}));

vi.mock("@/lib/admin-auth", () => ({ authorizeAdminRequest: mocks.authorize }));
vi.mock("@/lib/market-media", () => ({ getBrandAccentColor: (color: string) => color, getRecipePhoto: () => "/recipes/fallback.webp" }));
vi.mock("@/lib/db", () => {
  const transaction = { recipe: { create: mocks.recipeCreate }, auditLog: { create: mocks.auditCreate } };
  return {
    db: {
      product: { findMany: mocks.productFindMany },
      recipe: { findMany: mocks.recipeFindMany },
      $transaction: vi.fn((operation: (client: typeof transaction) => unknown) => operation(transaction)),
    },
  };
});

import { POST } from "@/app/api/admin/recipes/route";

const validRecipe = {
  titleFr: "Fonio aux légumes rôtis",
  titleEn: "Fonio with roasted vegetables",
  descriptionFr: "Une recette généreuse de fonio accompagnée de légumes rôtis et d'épices douces.",
  descriptionEn: "A generous fonio recipe served with roasted vegetables and gentle spices.",
  country: "Guinée",
  category: "mains",
  difficulty: "easy",
  timeMinutes: 40,
  baseServings: 4,
  imageEmoji: "🍲",
  imageUrl: "/recipes/fonio-legumes.webp",
  imageColor: "#D65A32",
  isPopular: false,
  isNew: true,
  isRecommended: true,
  status: "draft",
  stepsFr: ["Rincer soigneusement le fonio.", "Cuire puis ajouter les légumes rôtis."],
  stepsEn: ["Rinse the fonio thoroughly.", "Cook and add the roasted vegetables."],
  ingredients: [{ productId: "product-1", variantId: null, quantityPerBase: 400, unit: "g", role: "base", optional: false, alternativeProductIds: ["product-2"] }],
};

const request = (body: Record<string, unknown>) => new NextRequest("http://localhost/api/admin/recipes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

describe("POST /api/admin/recipes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authorize.mockResolvedValue({ ok: true, user: { id: "admin-1", email: "direction@je-mange-africain.com", role: "super_admin" } });
    mocks.productFindMany.mockResolvedValue([{ id: "product-1", variants: [] }, { id: "product-2", variants: [] }]);
    mocks.recipeFindMany.mockResolvedValue([]);
    mocks.recipeCreate.mockResolvedValue({ id: "recipe-1", slug: "fonio-aux-legumes-rotis", status: "draft" });
    mocks.auditCreate.mockResolvedValue({ id: "audit-1" });
  });

  it("persists curated alternatives with the stock-linked ingredient", async () => {
    const response = await POST(request(validRecipe));

    expect(response.status).toBe(201);
    expect(mocks.recipeCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        ingredients: { create: [expect.objectContaining({ productId: "product-1", alternatives: '["product-2"]' })] },
      }),
    });
    expect(mocks.auditCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ action: "recipe_create" }) });
  });

  it("refuses a missing curated alternative", async () => {
    mocks.productFindMany.mockResolvedValue([{ id: "product-1", variants: [] }]);
    const response = await POST(request(validRecipe));

    expect(response.status).toBe(400);
    expect(mocks.recipeCreate).not.toHaveBeenCalled();
  });
});
