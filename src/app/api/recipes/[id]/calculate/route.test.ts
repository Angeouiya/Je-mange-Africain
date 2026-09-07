import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  enforceRateLimit: vi.fn(),
  recipeFindFirst: vi.fn(),
  productFindMany: vi.fn(),
  computeRecipe: vi.fn(),
  getProductPhoto: vi.fn(),
  parseRecipeSteps: vi.fn(),
}));

vi.mock("@/lib/customer-auth", () => ({ authorizeCustomerRequest: mocks.authorize }));
vi.mock("@/lib/redis", () => ({ enforceRateLimit: mocks.enforceRateLimit }));
vi.mock("@/lib/db", () => ({ db: { recipe: { findFirst: mocks.recipeFindFirst }, product: { findMany: mocks.productFindMany } } }));
vi.mock("@/lib/recipe-engine", () => ({ computeRecipe: mocks.computeRecipe }));
vi.mock("@/lib/market-media", () => ({ getProductPhoto: mocks.getProductPhoto }));
vi.mock("@/lib/recipe-step-storage", () => ({ parseRecipeSteps: mocks.parseRecipeSteps }));
vi.mock("@/lib/recipe-publication", () => ({ PUBLIC_RECIPE_WHERE: { status: "published" } }));

import { POST } from "./route";

const validBody = {
  servings: 4,
  adults: 4,
  children: 0,
  portion: "normal",
  protein: "recipe",
  kplo: false,
  spiceLevel: "medium",
  formula: "standard",
  haveAtHome: [],
  excludedIngredients: [],
  replacements: {},
};

function request(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/recipes/recipe-1/calculate?locale=fr", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const product = {
  id: "product-attieke",
  traditionalName: "Attiéké",
  imageEmoji: "",
  imageUrl: "/products/attieke.webp",
  imageColor: "#B9472B",
  thermalClass: "REFRIGERATED",
  stockQty: 12,
  reservedQty: 1,
  categoryId: "category-manioc",
  category: { slug: "manioc" },
  translations: [{ locale: "fr", name: "Attiéké frais" }],
  variants: [{ id: "variant-1", label: "Sachet 500 g", weightGrams: 500, volumeMl: null, price: 5.9, isDefault: true }],
};

describe("POST /api/recipes/[id]/calculate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authorize.mockResolvedValue({ id: "customer-auth-1", email: "awa@example.fr", role: "customer" });
    mocks.enforceRateLimit.mockResolvedValue(null);
    mocks.getProductPhoto.mockReturnValue("/products/attieke.webp");
    mocks.parseRecipeSteps.mockReturnValue([{ instruction: "Réchauffer l'attiéké à la vapeur." }]);
    mocks.recipeFindFirst.mockResolvedValue({
      id: "recipe-1",
      baseServings: 4,
      translations: [{ locale: "fr", steps: "[]" }, { locale: "en", steps: "[]" }],
      ingredients: [{
        id: "recipe-ingredient-1",
        quantityPerBase: 500,
        unit: "g",
        role: "base",
        optional: false,
        alternatives: [],
        note: null,
        product,
      }],
    });
    mocks.productFindMany.mockResolvedValue([product]);
    mocks.computeRecipe.mockReturnValue({
      ingredients: [],
      totalCost: 0,
      costPerPerson: 0,
      totalWeightGrams: 0,
      thermalSplit: [],
      packageCount: 0,
      steps: { fr: ["Réchauffer l'attiéké à la vapeur."], en: ["Steam the attieke."] },
      stepSourceIndexes: { fr: [0], en: [0] },
      unavailableCount: 0,
      leftoverCount: 0,
    });
  });

  it("rate limits recipe recalculations before loading the catalogue", async () => {
    mocks.enforceRateLimit.mockResolvedValueOnce(new Response(JSON.stringify({ code: "RATE_LIMITED" }), { status: 429 }));

    const response = await POST(request(validBody), { params: Promise.resolve({ id: "recipe-1" }) });

    expect(response.status).toBe(429);
    expect(mocks.enforceRateLimit).toHaveBeenCalledWith(expect.any(NextRequest), "recipe-configurator", undefined, { scopes: ["ip", "route"] });
    expect(mocks.authorize).not.toHaveBeenCalled();
    expect(mocks.recipeFindFirst).not.toHaveBeenCalled();
    expect(mocks.computeRecipe).not.toHaveBeenCalled();
  });

  it("requires a connected customer before calculating a recipe basket", async () => {
    mocks.authorize.mockResolvedValue(null);

    const response = await POST(request(validBody), { params: Promise.resolve({ id: "recipe-1" }) });
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.error).toBe("Authentification client requise.");
    expect(mocks.recipeFindFirst).not.toHaveBeenCalled();
    expect(mocks.computeRecipe).not.toHaveBeenCalled();
  });

  it("calculates the private recipe basket for the connected customer", async () => {
    const response = await POST(request(validBody), { params: Promise.resolve({ id: "recipe-1" }) });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.locale).toBe("fr");
    expect(mocks.enforceRateLimit).toHaveBeenCalledWith(expect.any(NextRequest), "recipe-configurator", "customer-auth-1", { scopes: ["subject"] });
    expect(mocks.recipeFindFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: "recipe-1", status: "published" }) }));
    expect(mocks.productFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { status: "published" } }));
    expect(mocks.computeRecipe).toHaveBeenCalledWith(expect.objectContaining({ servings: 4 }), expect.objectContaining({ recipeId: "recipe-1", baseServings: 4 }));
  });
});
