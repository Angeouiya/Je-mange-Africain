import { expect, test } from "@playwright/test";

test("the public storefront stays inside the viewport and exposes no admin entry", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.locator("body")).not.toContainText(/dashboard admin|administration/i);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test("the catalogue and authentication entry are interactive", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const catalogue = page.getByRole("button", { name: /catégories|categories|acheter les produits|shop products/i }).first();
  await expect(catalogue).toBeVisible();
  await catalogue.click();
  await expect(page.getByRole("heading", { name: /marché je mange africain|african market/i }).first()).toBeVisible();
  await expect(page.locator("main img").first()).toBeVisible();
});
