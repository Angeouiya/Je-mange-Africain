import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  recipeFindUnique: vi.fn(),
  productFindMany: vi.fn(),
  recipeUpdate: vi.fn(),
  translationUpsert: vi.fn(),
  ingredientDeleteMany: vi.fn(),
  ingredientCreateMany: vi.fn(),
  auditCreate: vi.fn(),
}));

vi.mock("@/lib/admin-auth", () => ({ authorizeAdminRequest: mocks.authorize }));
vi.mock("@/lib/market-media", () => ({
  getBrandAccentColor: (color: string) => color,
  getProductPhoto: () => "/products/fallback.webp",
  getRecipePhoto: () => "/recipes/fallback.webp",
}));
vi.mock("@/lib/db", () => {
  const transaction = {
    recipe: { update: mocks.recipeUpdate },
    recipeTranslation: { upsert: mocks.translationUpsert },
    recipeIngredient: { deleteMany: mocks.ingredientDeleteMany, createMany: mocks.ingredientCreateMany },
    auditLog: { create: mocks.auditCreate },
  };
  return {
    db: {
      recipe: { findUnique: mocks.recipeFindUnique },
      product: { findMany: mocks.productFindMany },
      $transaction: vi.fn((operation: (client: typeof transaction) => unknown) => operation(transaction)),
    },
  };
});

import { PATCH } from "@/app/api/admin/recipes/[id]/route";
import { parseRecipeSteps } from "@/lib/recipe-step-storage";

const validRecipe = {
  titleFr: "Attiéké au poisson braisé",
  titleEn: "Attieke with grilled fish",
  descriptionFr: "Un grand classique ivoirien servi avec une garniture fraîche et relevée.",
  descriptionEn: "An Ivorian classic served with a fresh and gently spiced garnish.",
  country: "Côte d'Ivoire",
  category: "mains",
  difficulty: "medium",
  timeMinutes: 55,
  baseServings: 4,
  imageEmoji: "🍲",
  imageUrl: "/recipes/attieke-poisson.webp",
  imageColor: "#D65A32",
  isPopular: true,
  isNew: false,
  isRecommended: true,
  status: "published",
  stepsFr: ["Assaisonner soigneusement le poisson.", "Braiser puis servir avec l'attiéké."],
  stepsEn: ["Season the fish thoroughly.", "Grill and serve with the attieke."],
  stepDetails: [0, 1].map((index) => ({
    titleFr: index === 0 ? "Assaisonner le poisson" : "Braiser et dresser",
    titleEn: index === 0 ? "Season the fish" : "Grill and plate",
    durationMinutes: index === 0 ? 8 : 14,
    restMinutes: index === 0 ? 10 : 0,
    heat: index === 0 ? "none" : "high",
    temperatureC: null,
    equipmentFr: "Grand bol et pince",
    equipmentEn: "Large bowl and tongs",
    cueFr: "Le poisson est uniformément enrobé et prêt pour la cuisson.",
    cueEn: "The fish is evenly coated and ready for cooking.",
    tipFr: "Retourner le poisson avec une spatule large.",
    tipEn: "Turn the fish with a wide spatula.",
    warningFr: "Nettoyer la planche après le poisson cru.",
    warningEn: "Clean the board after handling raw fish.",
    whyFr: "Un assaisonnement uniforme garantit une cuisson régulière.",
    whyEn: "Even seasoning supports consistent cooking.",
    recoveryFr: "Prolonger la cuisson deux minutes si le centre reste translucide.",
    recoveryEn: "Cook for two more minutes if the centre remains translucent.",
    ingredientProductIds: ["product-1"],
  })),
  ingredients: [{ productId: "product-1", variantId: null, quantityPerBase: 500, unit: "g", role: "base", optional: false, alternativeProductIds: ["product-2"] }],
};

function request(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/admin/recipes/recipe-1", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}

describe("PATCH /api/admin/recipes/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authorize.mockResolvedValue({ ok: true, user: { id: "admin-1", email: "direction@je-mange-africain.com", role: "super_admin" } });
    mocks.recipeFindUnique.mockResolvedValue({ id: "recipe-1", country: "Côte d'Ivoire", category: "mains", status: "draft", baseServings: 4, translations: [], ingredients: [{ id: "old-ingredient" }] });
    mocks.productFindMany.mockResolvedValue([{ id: "product-1", variants: [] }, { id: "product-2", variants: [] }]);
    mocks.recipeUpdate.mockResolvedValue({ id: "recipe-1", slug: "attieke-poisson-braise", status: "published" });
    mocks.translationUpsert.mockResolvedValue({});
    mocks.ingredientDeleteMany.mockResolvedValue({ count: 1 });
    mocks.ingredientCreateMany.mockResolvedValue({ count: 1 });
    mocks.auditCreate.mockResolvedValue({ id: "audit-1" });
  });

  it("updates bilingual content and rebuilds stock-linked ingredients atomically", async () => {
    const response = await PATCH(request(validRecipe), { params: Promise.resolve({ id: "recipe-1" }) });

    expect(response.status).toBe(200);
    expect(mocks.translationUpsert).toHaveBeenCalledTimes(2);
    const frenchUpdate = mocks.translationUpsert.mock.calls.find(([call]) => call.where.recipeId_locale.locale === "fr")?.[0];
    const storedFrenchSteps = parseRecipeSteps(frenchUpdate.update.steps, "fr");
    expect(storedFrenchSteps.map((step) => step.instruction)).toEqual(validRecipe.stepsFr);
    expect(storedFrenchSteps[0]).toMatchObject({ title: "Assaisonner le poisson", why: expect.stringContaining("cuisson régulière"), recovery: expect.stringContaining("deux minutes"), ingredientProductIds: ["product-1"] });
    expect(mocks.ingredientDeleteMany).toHaveBeenCalledWith({ where: { recipeId: "recipe-1" } });
    expect(mocks.ingredientCreateMany).toHaveBeenCalledWith({ data: [expect.objectContaining({ recipeId: "recipe-1", productId: "product-1", quantityPerBase: 500, alternatives: '["product-2"]' })] });
    expect(mocks.auditCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ action: "recipe_update", entityId: "recipe-1" }) });
  });

  it("refuses a variant that does not belong to the selected product", async () => {
    const response = await PATCH(request({ ...validRecipe, ingredients: [{ ...validRecipe.ingredients[0], variantId: "variant-missing" }] }), { params: Promise.resolve({ id: "recipe-1" }) });

    expect(response.status).toBe(400);
    expect(mocks.recipeUpdate).not.toHaveBeenCalled();
    expect(mocks.ingredientDeleteMany).not.toHaveBeenCalled();
  });

  it("refuses an alternative that no longer belongs to the catalogue", async () => {
    mocks.productFindMany.mockResolvedValue([{ id: "product-1", variants: [] }]);
    const response = await PATCH(request(validRecipe), { params: Promise.resolve({ id: "recipe-1" }) });

    expect(response.status).toBe(400);
    expect(mocks.recipeUpdate).not.toHaveBeenCalled();
  });
});
