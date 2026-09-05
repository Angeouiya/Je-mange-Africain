import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("jma-privacy-consent-v1", JSON.stringify({ version: 1, necessary: true, analytics: false, personalization: false, marketing: false, updatedAt: "2026-09-05T12:00:00.000Z" })));
});

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

test("the installable storefront exposes a safe app shell and public discovery map", async ({ page, request }) => {
  const manifestResponse = await request.get("/manifest.json");
  expect(manifestResponse.ok()).toBeTruthy();
  const manifest = await manifestResponse.json();
  expect(manifest.display).toBe("standalone");
  expect(manifest.orientation).toBeUndefined();
  expect(manifest.icons.map((icon: { src: string }) => icon.src)).toEqual([
    "/brand/app-icon-192-burgundy.png",
    "/brand/app-icon-512-burgundy.png",
  ]);
  expect(manifest.shortcuts.every((shortcut: { icons: { src: string }[] }) => shortcut.icons[0]?.src === "/brand/app-icon-192-burgundy.png")).toBe(true);
  expect(manifest.shortcuts.map((shortcut: { url: string }) => shortcut.url)).toEqual(expect.arrayContaining([
    "/?view=catalog",
    "/?view=recipes",
    "/?view=wholesale",
    "/?view=orders",
  ]));

  const workerResponse = await request.get("/sw.js");
  expect(workerResponse.ok()).toBeTruthy();
  const workerSource = await workerResponse.text();
  expect(workerSource).toContain('url.pathname.startsWith("/api/")');
  expect(workerSource).toContain('const CACHE_NAME = "jma-shell-v3"');
  expect(workerSource).toContain('/brand/notification-icon-burgundy.png');

  const sitemapResponse = await request.get("/sitemap.xml");
  expect(sitemapResponse.ok()).toBeTruthy();
  const sitemap = await sitemapResponse.text();
  expect(sitemap).toContain("view=catalog");
  expect(sitemap).toContain("view=recipes");

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect.poll(() => page.evaluate(async () => Boolean(await navigator.serviceWorker.getRegistration()))).toBe(true);
});
