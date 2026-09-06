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

const detailedStepFr = "Cuire doucement le fonio pendant douze minutes en remuant depuis le fond, jusqu'à obtenir des grains tendres, légers et parfaitement séparés.";
const detailedStepEn = "Cook the fonio gently for twelve minutes, stirring from the bottom, until the grains are tender, light and perfectly separated.";
const publishReadyRecipe = {
  ...validRecipe,
  status: "published",
  stepsFr: Array(5).fill(detailedStepFr),
  stepsEn: Array(5).fill(detailedStepEn),
  stepDetails: Array.from({ length: 5 }, () => ({
    titleFr: "Maîtriser la cuisson",
    titleEn: "Control the cooking",
    durationMinutes: 12,
    restMinutes: 0,
    heat: "low",
    temperatureC: null,
    equipmentFr: "Cocotte et cuillère en bois",
    equipmentEn: "Heavy pot and wooden spoon",
    cueFr: "Les grains sont tendres, légers et parfaitement séparés.",
    cueEn: "The grains are tender, light and perfectly separated.",
    tipFr: "Remuer régulièrement depuis le fond de la cocotte.",
    tipEn: "Stir regularly from the bottom of the pot.",
    warningFr: "",
    warningEn: "",
    whyFr: "La cuisson douce hydrate les grains sans les écraser.",
    whyEn: "Gentle cooking hydrates the grains without crushing them.",
    recoveryFr: "Ajouter une cuillère d'eau chaude si les grains restent fermes.",
    recoveryEn: "Add one spoonful of hot water if the grains remain firm.",
    ingredientProductIds: ["product-1"],
  })),
};

const request = (body: Record<string, unknown>) => new NextRequest("http://localhost/api/admin/recipes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

describe("POST /api/admin/recipes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authorize.mockResolvedValue({ ok: true, user: { id: "admin-1", email: "direction@je-mange-africain.com", role: "super_admin" } });
    mocks.productFindMany.mockResolvedValue([{ id: "product-1", status: "published", variants: [] }, { id: "product-2", status: "published", variants: [] }]);
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
    mocks.productFindMany.mockResolvedValue([{ id: "product-1", status: "published", variants: [] }]);
    const response = await POST(request(validRecipe));

    expect(response.status).toBe(400);
    expect(mocks.recipeCreate).not.toHaveBeenCalled();
  });

  it("keeps a recipe out of the storefront while a primary product is not published", async () => {
    mocks.productFindMany.mockResolvedValue([
      { id: "product-1", status: "draft", variants: [] },
      { id: "product-2", status: "published", variants: [] },
    ]);

    const response = await POST(request(publishReadyRecipe));
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.unpublishedProductIds).toEqual(["product-1"]);
    expect(mocks.recipeCreate).not.toHaveBeenCalled();
  });

  it("requires at least one non-optional ingredient for a published recipe", async () => {
    const response = await POST(request({
      ...publishReadyRecipe,
      ingredients: publishReadyRecipe.ingredients.map((ingredient) => ({ ...ingredient, optional: true })),
    }));
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.error).toContain("au moins un ingrédient obligatoire");
    expect(mocks.recipeCreate).not.toHaveBeenCalled();
  });
});
