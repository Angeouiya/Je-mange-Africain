import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BRAND_ACCENT_COLORS, BRAND_COLORS, getBrandAccentForeground, getReadableBrandAccent } from "@/lib/brand-colors";
import { getBrandAccentColor, getProductPhoto, getRecipeGallery, getRecipePhoto } from "@/lib/market-media";

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

  it("keeps the managed recipe photo first and removes duplicate gallery entries", () => {
    expect(getRecipeGallery({
      slug: "mafe",
      imageUrl: "/recipes/mafe-managed.webp",
      galleryUrls: ["/recipes/mafe-side.webp", "/recipes/mafe-managed.webp", "/recipes/mafe-side.webp"],
    })).toEqual(["/recipes/mafe-managed.webp", "/recipes/mafe-side.webp"]);
  });

  it("normalizes chromatic accents to the logo palette and preserves neutrals", () => {
    expect(getBrandAccentColor("#3F681C")).toBe("#8A3042");
    expect(getBrandAccentColor("#16a34a")).toBe("#8A3042");
    expect(getBrandAccentColor("#326B8A")).toBe("#8A3042");
    expect(getBrandAccentColor("#6C5D7B")).toBe("#8A3042");
    expect(getBrandAccentColor("#D65A32")).toBe("#D65A32");
    expect(getBrandAccentColor("#F2A900")).toBe("#F2A900");
    expect(getBrandAccentColor("#F7F4F3")).toBe("#F7F4F3");
    expect(getBrandAccentColor("#000000")).toBe("#3F2930");
    expect(getBrandAccentColor("green")).toBe("#8A3042");
  });

  it("keeps every managed accent outside the green and cool-blue spectrum", () => {
    for (const color of BRAND_ACCENT_COLORS) {
      const value = Number.parseInt(color.slice(1), 16);
      const red = (value >> 16) & 255;
      const green = (value >> 8) & 255;
      const blue = value & 255;

      expect(green > red * 1.08 && green > blue * 1.08, color).toBe(false);
      expect(blue > red * 1.08 && blue > green * 1.05, color).toBe(false);
    }
  });

  it("pairs light logo accents with accessible foreground colors", () => {
    expect(getReadableBrandAccent(BRAND_COLORS.gold)).toBe(BRAND_COLORS.deepEarth);
    expect(getReadableBrandAccent(BRAND_COLORS.burgundy)).toBe(BRAND_COLORS.burgundy);
    expect(getBrandAccentForeground(BRAND_COLORS.gold)).toBe(BRAND_COLORS.charcoal);
    expect(getBrandAccentForeground(BRAND_COLORS.earth)).toBe(BRAND_COLORS.cream);
  });
});
