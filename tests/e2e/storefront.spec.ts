import { expect, type Locator, type Page, test } from "@playwright/test";

const anonymousHomePayload = {
  categories: [
    { id: "cat-auth-manioc", slug: "manioc", name: "Manioc & dérivés", color: "#B9472B" },
  ],
  bestsellers: [
    {
      id: "product-auth-attieke",
      sku: "JMA-AUTH-ATT",
      traditionalName: "Attiéké premium",
      name: "Attiéké premium",
      nameFr: "Attiéké premium",
      nameEn: "Premium attieke",
      price: 6.9,
      promoPrice: 5.9,
      pricePerKg: 11.8,
      stockQty: 12,
      alertThreshold: 3,
      country: "Côte d'Ivoire",
      brandName: "JMA",
      category: { id: "cat-auth-manioc", slug: "manioc", name: "Manioc & dérivés", color: "#B9472B" },
      categorySlug: "manioc",
      categoryName: "Manioc & dérivés",
      description: "Semoule de manioc fermentée prête pour les plats ivoiriens.",
      imageUrl: "/products/attieke.webp",
      imageColor: "#B9472B",
      imageEmoji: "",
      isBestseller: true,
      isRecommended: true,
      isNew: false,
      isOnSale: true,
      thermalClass: "REFRIGERATED",
      packaging: "Sachet 500 g",
      unit: "500 g",
      variants: [{ id: "variant-auth-attieke", label: "Sachet 500 g", weightGrams: 500, price: 5.9, isDefault: true }],
    },
  ],
  news: [],
  onSale: [],
  popularRecipes: [
    {
      id: "recipe-auth-garba",
      slug: "garba-premium",
      title: "Garba premium",
      description: "Attiéké, thon et condiments pour un panier entièrement ajustable.",
      country: "Côte d'Ivoire",
      category: "Plats",
      difficulty: "easy",
      timeMinutes: 35,
      baseServings: 4,
      imageColor: "#8A3042",
      imageEmoji: "",
      imageUrl: "/recipes/attieke-poisson.webp",
      isPopular: true,
      ingredientCount: 7,
    },
  ],
};

const anonymousHomeCampaign = {
  id: "campaign-auth-lock",
  placement: "home",
  title: "Table ivoirienne du week-end",
  body: "Une sélection publiée par l'équipe Je mange Africain.",
  imageUrl: "/hero-feast-v2.webp",
  imageAlt: "Table de plats africains",
  linkUrl: "https://partner.example/offre",
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("jma-privacy-consent-v1", JSON.stringify({ version: 1, necessary: true, analytics: false, personalization: false, marketing: false, updatedAt: "2026-09-05T12:00:00.000Z" })));
});

async function seedAnonymousHome(page: Page, advertisements: unknown[] = []) {
  await page.route("**/api/auth/customer/session", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ customer: null, addresses: [] }),
  }));
  await page.route("**/api/advertisements?*", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ advertisements }),
  }));
  await page.route("**/api/catalog?*", (route) => {
    const url = new URL(route.request().url());
    const payload = url.searchParams.get("section") === "home"
      ? anonymousHomePayload
      : { products: [], total: 0, page: 1, pageSize: 48, pages: 0, filters: { categories: [], brands: [], countries: [] } };
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(payload),
    });
  });
}

async function expectAuthGateAfter(action: Locator, page: Page) {
  await action.scrollIntoViewIfNeeded();
  await expect(action).toBeVisible();
  await action.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByTestId("customer-auth-workspace")).toBeVisible();
  await expect(dialog.getByTestId("auth-return-context")).toContainText(/connexion requise|sign-in required/i);
  await dialog.getByRole("button", { name: /fermer la connexion|close sign-in/i }).click();
  await expect(dialog).toBeHidden();
}

test("the public storefront stays inside the viewport and exposes no admin entry", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.locator("body")).not.toContainText(/dashboard admin|administration/i);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test("the catalogue and authentication entry are interactive", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const catalogue = page.getByRole("button", { name: /marché|market|catégories|categories|acheter les produits|shop products/i }).first();
  await expect(catalogue).toBeVisible();
  await catalogue.click();
  const authDialog = page.getByRole("dialog");
  await expect(authDialog.getByTestId("customer-auth-workspace")).toBeVisible();
  await expect(authDialog.getByTestId("auth-return-context")).toContainText(/connexion requise|sign-in required/i);
  await authDialog.getByRole("button", { name: /fermer la connexion|close sign-in/i }).click();
  await expect(page.getByRole("heading", { name: /favoris du moment|popular favourites/i })).toBeVisible();
});

test("anonymous customer actions require sign-in before continuing", async ({ page }) => {
  await seedAnonymousHome(page);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /favoris du moment|popular favourites/i })).toBeVisible();

  const actions = [
    page.getByRole("combobox", { name: /recherche globale|global search/i }).first(),
    page.getByTestId("home-hero").getByRole("button", { name: /découvrir le marché|discover the market/i }),
    page.getByTestId("home-hero").getByRole("button", { name: /composer une recette|compose a recipe/i }),
    page.getByRole("button", { name: /modifier la destination de livraison|change delivery destination/i }).first(),
    page.getByRole("button", { name: /voir attiéké premium|view premium attieke/i }).first(),
    page.getByRole("button", { name: /explorer le rayon manioc|explore manioc/i }).first(),
    page.getByTestId("home-bestseller-rail").getByRole("button", { name: /connectez-vous pour ajouter au panier|sign in to add to basket/i }).first(),
    page.getByTestId("home-bestseller-rail").getByRole("button", { name: /connectez-vous pour enregistrer attiéké premium|sign in to save premium attieke/i }).first(),
    page.getByRole("button", { name: /connectez-vous pour configurer la recette garba premium|sign in to configure the garba premium recipe/i }),
    page.getByRole("button", { name: /connectez-vous pour sauvegarder garba premium|sign in to save garba premium/i }),
  ];

  for (const action of actions) {
    await expectAuthGateAfter(action, page);
  }
});

test("anonymous campaign actions require sign-in even for external links", async ({ page }) => {
  await seedAnonymousHome(page, [anonymousHomeCampaign]);

  await page.goto("/", { waitUntil: "domcontentloaded" });
  const campaign = page.getByTestId("advertisement-home");
  await expect(campaign).toBeVisible();
  await expectAuthGateAfter(campaign.getByRole("button", { name: /connexion requise|sign in required/i }), page);
  expect(page.url()).not.toContain("partner.example");
});

test("anonymous direct access to support contact is guarded while legal pages stay public", async ({ page }) => {
  await seedAnonymousHome(page);

  await page.goto("/?view=info&infoPage=contact", { waitUntil: "domcontentloaded" });
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByTestId("customer-auth-workspace")).toBeVisible();
  await expect(dialog.getByTestId("auth-return-context")).toContainText(/connexion requise|sign-in required/i);
  await dialog.getByRole("button", { name: /fermer la connexion|close sign-in/i }).click();
  await expect(page.getByRole("heading", { name: /favoris du moment|popular favourites/i })).toBeVisible();

  await page.goto("/?view=info&infoPage=privacy", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText(/politique de confidentialité|privacy policy/i).first()).toBeVisible();
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
  expect(workerSource).toContain('const CACHE_NAME = "jma-shell-v4"');
  expect(workerSource).toContain('const PUBLIC_API_CACHE_NAME = "jma-public-api-v1"');
  expect(workerSource).toContain("/^\\/api\\/catalog$/");
  expect(workerSource).toContain("/^\\/api\\/products\\/[^/]+$/");
  expect(workerSource).toContain('if (url.pathname.startsWith("/api/")) return;');
  expect(workerSource).toContain('/brand/notification-icon-burgundy.png');

  const sitemapResponse = await request.get("/sitemap.xml");
  expect(sitemapResponse.ok()).toBeTruthy();
  const sitemap = await sitemapResponse.text();
  expect(sitemap).toContain("view=catalog");
  expect(sitemap).toContain("view=recipes");

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect.poll(() => page.evaluate(async () => Boolean(await navigator.serviceWorker.getRegistration()))).toBe(true);
});
