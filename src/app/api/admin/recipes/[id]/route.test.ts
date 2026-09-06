import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  recipeFindUnique: vi.fn(),
  recipeDelete: vi.fn(),
  productFindMany: vi.fn(),
  recipeUpdate: vi.fn(),
  translationUpsert: vi.fn(),
  ingredientDeleteMany: vi.fn(),
  ingredientCreateMany: vi.fn(),
  orderItemCount: vi.fn(),
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
    recipe: { update: mocks.recipeUpdate, delete: mocks.recipeDelete },
    recipeTranslation: { upsert: mocks.translationUpsert },
    recipeIngredient: { deleteMany: mocks.ingredientDeleteMany, createMany: mocks.ingredientCreateMany },
    auditLog: { create: mocks.auditCreate },
  };
  return {
    db: {
      recipe: { findUnique: mocks.recipeFindUnique, update: mocks.recipeUpdate },
      product: { findMany: mocks.productFindMany },
      orderItem: { count: mocks.orderItemCount },
      auditLog: { create: mocks.auditCreate },
      $transaction: vi.fn((operation: (client: typeof transaction) => unknown) => operation(transaction)),
    },
  };
});

import { DELETE, PATCH } from "@/app/api/admin/recipes/[id]/route";
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
  status: "draft",
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

const detailedStepFr = "Cuire doucement le poisson pendant douze minutes en le retournant avec soin, jusqu'à obtenir une chair opaque, moelleuse et facilement détachable.";
const detailedStepEn = "Cook the fish gently for twelve minutes, turning it carefully, until the flesh is opaque, moist and flakes away easily.";
const publishReadyRecipe = {
  ...validRecipe,
  status: "published",
  stepsFr: Array(5).fill(detailedStepFr),
  stepsEn: Array(5).fill(detailedStepEn),
  stepDetails: Array.from({ length: 5 }, () => ({
    ...validRecipe.stepDetails[0],
    titleFr: "Maîtriser la cuisson",
    titleEn: "Control the cooking",
    ingredientProductIds: ["product-1"],
  })),
};

const readyStoredStep = (instruction: string, locale: "fr" | "en") => ({
  version: 2,
  instruction,
  title: locale === "fr" ? "Maîtriser la cuisson" : "Control the cooking",
  durationMinutes: 12,
  restMinutes: 0,
  heat: "low",
  temperatureC: null,
  equipment: locale === "fr" ? "Cocotte et cuillère en bois" : "Heavy pot and wooden spoon",
  cue: locale === "fr" ? "La chair est opaque et moelleuse." : "The flesh is opaque and moist.",
  tip: locale === "fr" ? "Retourner délicatement avec une spatule large." : "Turn gently with a wide spatula.",
  warning: null,
  why: locale === "fr" ? "La cuisson douce conserve le moelleux du poisson." : "Gentle cooking keeps the fish moist.",
  recovery: locale === "fr" ? "Poursuivre deux minutes si le centre reste translucide." : "Cook for two more minutes if the centre remains translucent.",
  ingredientProductIds: ["product-1"],
});

const publishReadyTranslations = [
  { locale: "fr", steps: JSON.stringify(Array.from({ length: 5 }, () => readyStoredStep(detailedStepFr, "fr"))) },
  { locale: "en", steps: JSON.stringify(Array.from({ length: 5 }, () => readyStoredStep(detailedStepEn, "en"))) },
];

function request(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/admin/recipes/recipe-1", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}

function deleteRequest() {
  return new NextRequest("http://localhost/api/admin/recipes/recipe-1", { method: "DELETE" });
}

describe("PATCH /api/admin/recipes/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authorize.mockResolvedValue({ ok: true, user: { id: "admin-1", email: "direction@je-mange-africain.com", role: "super_admin" } });
    mocks.recipeFindUnique.mockResolvedValue({ id: "recipe-1", country: "Côte d'Ivoire", category: "mains", status: "draft", baseServings: 4, translations: [], ingredients: [{ id: "old-ingredient" }] });
    mocks.productFindMany.mockResolvedValue([{ id: "product-1", status: "published", variants: [] }, { id: "product-2", status: "published", variants: [] }]);
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
    mocks.productFindMany.mockResolvedValue([{ id: "product-1", status: "published", variants: [] }]);
    const response = await PATCH(request(publishReadyRecipe), { params: Promise.resolve({ id: "recipe-1" }) });

    expect(response.status).toBe(400);
    expect(mocks.recipeUpdate).not.toHaveBeenCalled();
  });

  it("refuses a full publication while a primary product is still a draft", async () => {
    mocks.productFindMany.mockResolvedValue([
      { id: "product-1", status: "draft", variants: [] },
      { id: "product-2", status: "published", variants: [] },
    ]);

    const response = await PATCH(request(publishReadyRecipe), { params: Promise.resolve({ id: "recipe-1" }) });
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.unpublishedProductIds).toEqual(["product-1"]);
    expect(mocks.recipeUpdate).not.toHaveBeenCalled();
    expect(mocks.ingredientDeleteMany).not.toHaveBeenCalled();
  });

  it("does not downgrade an invalid full publication to a quick editorial update", async () => {
    const response = await PATCH(request({ ...validRecipe, status: "published" }), { params: Promise.resolve({ id: "recipe-1" }) });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain("fiche complète");
    expect(payload.details.fieldErrors.stepsFr).toBeDefined();
    expect(mocks.recipeUpdate).not.toHaveBeenCalled();
  });

  it("refuses a quick editorial publication when a linked product is not public", async () => {
    mocks.recipeFindUnique.mockResolvedValue({
      imageUrl: "/recipes/attieke-poisson.webp",
      galleryUrls: "[]",
      status: "draft",
      isNew: true,
      isRecommended: true,
      isPopular: false,
      ingredients: [{ productId: "product-1", product: { status: "archived" } }],
    });

    const response = await PATCH(request({
      imageUrl: "/recipes/attieke-poisson.webp",
      galleryUrls: [],
      status: "published",
      isNew: true,
      isRecommended: true,
      isPopular: false,
    }), { params: Promise.resolve({ id: "recipe-1" }) });
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.unpublishedProductIds).toEqual(["product-1"]);
    expect(mocks.recipeUpdate).not.toHaveBeenCalled();
  });

  it("refuses a quick publication for a legacy recipe without a required ingredient", async () => {
    mocks.recipeFindUnique.mockResolvedValue({
      imageUrl: "/recipes/attieke-poisson.webp",
      galleryUrls: "[]",
      status: "draft",
      isNew: true,
      isRecommended: true,
      isPopular: false,
      ingredients: [],
    });

    const response = await PATCH(request({
      imageUrl: "/recipes/attieke-poisson.webp",
      galleryUrls: [],
      status: "published",
      isNew: true,
      isRecommended: true,
      isPopular: false,
    }), { params: Promise.resolve({ id: "recipe-1" }) });
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.error).toContain("au moins un ingrédient obligatoire");
    expect(mocks.recipeUpdate).not.toHaveBeenCalled();
  });

  it("refuses a quick publication when the saved preparation is too brief", async () => {
    mocks.recipeFindUnique.mockResolvedValue({
      imageUrl: "/recipes/attieke-poisson.webp",
      galleryUrls: "[]",
      status: "draft",
      isNew: true,
      isRecommended: true,
      isPopular: false,
      translations: [
        { locale: "fr", steps: JSON.stringify(["Cuire le poisson."]) },
        { locale: "en", steps: JSON.stringify(["Cook the fish."]) },
      ],
      ingredients: [{ productId: "product-1", optional: false, product: { status: "published" } }],
    });

    const response = await PATCH(request({
      imageUrl: "/recipes/attieke-poisson.webp",
      galleryUrls: [],
      status: "published",
      isNew: true,
      isRecommended: true,
      isPopular: false,
    }), { params: Promise.resolve({ id: "recipe-1" }) });
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.error).toContain("détaillez et reliez toute la préparation");
    expect(payload.preparationQuality.ready).toBe(false);
    expect(mocks.recipeUpdate).not.toHaveBeenCalled();
  });

  it("allows quick publication once the stored preparation is complete", async () => {
    mocks.recipeFindUnique.mockResolvedValue({
      imageUrl: "/recipes/attieke-poisson.webp",
      galleryUrls: "[]",
      status: "draft",
      isNew: true,
      isRecommended: true,
      isPopular: false,
      translations: publishReadyTranslations,
      ingredients: [{ productId: "product-1", optional: false, product: { status: "published" } }],
    });

    const response = await PATCH(request({
      imageUrl: "/recipes/attieke-poisson.webp",
      galleryUrls: [],
      status: "published",
      isNew: true,
      isRecommended: true,
      isPopular: false,
    }), { params: Promise.resolve({ id: "recipe-1" }) });

    expect(response.status).toBe(200);
    expect(mocks.recipeUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: "published" }),
    }));
  });
});

describe("DELETE /api/admin/recipes/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authorize.mockResolvedValue({ ok: true, user: { id: "admin-1", email: "direction@je-mange-africain.com", role: "super_admin" } });
    mocks.recipeFindUnique.mockResolvedValue({ id: "recipe-1", slug: "attieke-poisson-braise", translations: [{ title: "Attiéké poisson braisé" }] });
    mocks.orderItemCount.mockResolvedValue(0);
    mocks.recipeDelete.mockResolvedValue({ id: "recipe-1" });
    mocks.auditCreate.mockResolvedValue({ id: "audit-1" });
  });

  it("deletes an unused recipe and records the action", async () => {
    const response = await DELETE(deleteRequest(), { params: Promise.resolve({ id: "recipe-1" }) });

    expect(response.status).toBe(200);
    expect(mocks.orderItemCount).toHaveBeenCalledWith({ where: { recipeId: "recipe-1" } });
    expect(mocks.recipeDelete).toHaveBeenCalledWith({ where: { id: "recipe-1" } });
    expect(mocks.auditCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ action: "recipe_delete", entityId: "recipe-1" }) });
  });

  it("refuses to delete a recipe already attached to customer orders", async () => {
    mocks.orderItemCount.mockResolvedValue(2);

    const response = await DELETE(deleteRequest(), { params: Promise.resolve({ id: "recipe-1" }) });
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.error).toContain("liée à des commandes");
    expect(mocks.recipeDelete).not.toHaveBeenCalled();
    expect(mocks.auditCreate).not.toHaveBeenCalled();
  });
});
