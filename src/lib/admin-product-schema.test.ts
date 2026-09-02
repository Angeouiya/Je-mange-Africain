import { describe, expect, it } from "vitest";
import { productAdminInput, roundMoney } from "./admin-product-schema";

const validProduct = {
  nameFr: "Attiéké frais",
  nameEn: "Fresh attieke",
  traditionalName: "Attiéké",
  sku: "JMA-ATT-500",
  categoryId: "category-1",
  country: "Côte d'Ivoire",
  packaging: "Sachet 500 g",
  descriptionFr: "Semoule de manioc fermentée, fraîche et légère.",
  descriptionEn: "Light and fresh fermented cassava couscous.",
  costPrice: "3.20",
  profitMargin: "1.80",
  promoPrice: "",
  stockQty: "84",
  netWeightGrams: "500",
  thermalClass: "REFRIGERATED",
  storageType: "REFRIGERE",
  aliases: ["atchéké"],
  imageUrl: "https://cdn.je-mange-africain.com/products/attieke.webp",
  status: "published",
  isNew: false,
  isRecommended: true,
  isBestseller: true,
};

describe("admin product pricing contract", () => {
  it("coerces admin fields and calculates the customer price from cost and margin", () => {
    const product = productAdminInput.parse(validProduct);

    expect(product.costPrice).toBe(3.2);
    expect(product.profitMargin).toBe(1.8);
    expect(product.promoPrice).toBe("");
    expect(roundMoney(product.costPrice + product.profitMargin)).toBe(5);
  });

  it("requires complete bilingual content and a real image URL", () => {
    const result = productAdminInput.safeParse({ ...validProduct, nameEn: "", imageUrl: "/products/attieke.webp" });

    expect(result.success).toBe(false);
    if (result.success) return;
    const fields = result.error.flatten().fieldErrors;
    expect(fields.nameEn).toBeDefined();
    expect(fields.imageUrl).toBeDefined();
  });

  it("rounds floating point totals to accounting cents", () => {
    expect(roundMoney(2.675)).toBe(2.68);
    expect(roundMoney(0.1 + 0.2)).toBe(0.3);
  });
});
