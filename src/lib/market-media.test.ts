import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getBrandAccentColor, getProductPhoto, getRecipePhoto } from "@/lib/market-media";

describe("market media", () => {
  it("maps product identities to their dedicated photo", () => {
    expect(getProductPhoto({ traditionalName: "Attiéké" })).toBe("/products/attieke.webp");
    expect(getProductPhoto({ traditionalName: "Morue salée" })).toBe("/products/morue-salee.webp");
    expect(getProductPhoto({ traditionalName: "Pâte d'arachide" })).toBe("/products/pate-arachide.webp");
  });

  it("keeps a real local image for every seeded product and recipe", () => {
    const seed = readFileSync(join(process.cwd(), "prisma", "seed.ts"), "utf8");
    const productSection = seed.slice(seed.indexOf("const products:"), seed.indexOf("const productIds:"));
    const recipeSection = seed.slice(seed.indexOf("const recipes:"), seed.indexOf("// fix mafe"));
    const productSlugs = [...productSection.matchAll(/^    \["([^"]+)", "JMA-/gm)].map((match) => match[1]).sort();
    const recipeSlugs = [...recipeSection.matchAll(/^    \["([^"]+)",/gm)].map((match) => match[1]).sort();
    const productImages = readdirSync(join(process.cwd(), "public", "products")).filter((file) => file.endsWith(".webp")).map((file) => file.replace(/\.webp$/, "")).sort();
    const recipeImages = readdirSync(join(process.cwd(), "public", "recipes")).filter((file) => file.endsWith(".webp")).map((file) => file.replace(/\.webp$/, "")).sort();

    expect(productImages).toEqual(productSlugs);
    expect(recipeImages).toEqual(recipeSlugs);
    for (const slug of productSlugs) expect(getProductPhoto({ slug })).toBe(`/products/${slug}.webp`);
    for (const slug of recipeSlugs) expect(getRecipePhoto({ slug })).toBe(`/recipes/${slug}.webp`);
  });

  it("prefers an explicitly managed product or recipe image", () => {
    expect(getProductPhoto({ traditionalName: "Attiéké", imageUrl: "https://cdn.example.com/attieke.webp" })).toBe("https://cdn.example.com/attieke.webp");
    expect(getRecipePhoto({ slug: "mafe", imageUrl: "https://cdn.example.com/mafe.webp" })).toBe("https://cdn.example.com/mafe.webp");
  });

  it("removes green accents while preserving the logo palette", () => {
    expect(getBrandAccentColor("#3F681C")).toBe("#8A3042");
    expect(getBrandAccentColor("#16a34a")).toBe("#8A3042");
    expect(getBrandAccentColor("#D65A32")).toBe("#D65A32");
    expect(getBrandAccentColor("#F2A900")).toBe("#F2A900");
  });
});
