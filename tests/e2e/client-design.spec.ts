import AxeBuilder from "@axe-core/playwright";
import { expect, type Locator, type Page, test } from "@playwright/test";

async function expectNoHorizontalOverflow(page: Page, scope?: Locator) {
  const overflow = await (scope || page.locator("html")).evaluate((element) => element.scrollWidth - element.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

async function expectNoSeriousA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  const blocking = results.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious");
  expect(blocking, blocking.map((violation) => `${violation.id}: ${violation.help}`).join("\n")).toEqual([]);
}

async function expectLoadedProductImages(images: Locator, maximum = 4) {
  const count = Math.min(await images.count(), maximum);
  expect(count).toBeGreaterThan(0);
  for (let index = 0; index < count; index += 1) {
    const image = images.nth(index);
    await image.scrollIntoViewIfNeeded();
    await expect(image).toBeVisible();
    await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBeGreaterThan(0);
  }
}

async function expectBrandSafeUiColors(page: Page) {
  const forbiddenStyles = await page.locator("body").evaluate((body) => {
    const ignoredTags = new Set(["IMG", "PICTURE", "VIDEO", "CANVAS"]);
    const properties = ["color", "backgroundColor", "borderTopColor", "borderRightColor", "borderBottomColor", "borderLeftColor"] as const;
    const isForbidden = (color: string) => {
      const match = color.match(/rgba?\((\d+)[, ]+(\d+)[, ]+(\d+)(?:[, /]+([\d.]+))?/i);
      if (!match) return false;
      const [, red, green, blue] = match.map(Number);
      const alpha = match[4] === undefined ? 1 : Number(match[4]);
      if (alpha === 0) return false;
      const isGreen = green > red * 1.08 && green > blue * 1.08;
      const isCoolBlue = blue > red * 1.08 && blue > green * 1.05;
      const isNearBlack = red < 20 && green < 20 && blue < 20;
      return isGreen || isCoolBlue || isNearBlack;
    };

    return [...body.querySelectorAll<HTMLElement>("*")]
      .filter((element) => !ignoredTags.has(element.tagName) && element.getClientRects().length > 0)
      .flatMap((element) => {
        const styles = getComputedStyle(element);
        return properties
          .map((property) => ({ element: `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ""}`, property, color: styles[property] }))
          .filter(({ color }) => isForbidden(color));
      })
      .slice(0, 20);
  });

  expect(forbiddenStyles, `off-brand green, blue or black UI styles remain: ${JSON.stringify(forbiddenStyles)}`).toEqual([]);
}

test("the client application exposes clear catalogue, recipe and basket workspaces", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.locator("body")).not.toContainText(/dashboard admin|administration/i);
  const accentColors = await page.evaluate(() => {
    const styles = getComputedStyle(document.documentElement);
    return ["--terre", "--gold", "--burgundy", "--burgundy-dark"].map((token) => styles.getPropertyValue(token).trim());
  });
  const greenAccents = accentColors.filter((color) => {
    const match = color.match(/^#([0-9a-f]{6})$/i);
    if (!match) return false;
    const value = Number.parseInt(match[1], 16);
    const red = (value >> 16) & 255;
    const green = (value >> 8) & 255;
    const blue = value & 255;
    return green > red * 1.08 && green > blue * 1.08;
  });
  expect(greenAccents, `green accents remain in the computed palette: ${greenAccents.join(", ")}`).toEqual([]);
  await expectBrandSafeUiColors(page);
  const favouritesHeading = page.getByRole("heading", { name: /favoris du moment|popular favourites/i });
  await expect(favouritesHeading).toBeVisible();
  const favouritesRail = page.getByTestId("home-favourites-rail");
  await expect(favouritesRail).toBeVisible();
  await expectLoadedProductImages(favouritesRail.locator("img"));
  const categoryHeading = page.getByRole("heading", { name: /explorer les rayons|explore departments/i });
  await expect(categoryHeading).toBeVisible();
  const categoryBox = await categoryHeading.boundingBox();
  const isMobile = (page.viewportSize()?.width || 0) < 768;
  if (isMobile) expect(categoryBox?.y || Number.POSITIVE_INFINITY).toBeLessThan(page.viewportSize()?.height || 0);
  if (!isMobile) {
    const sidebar = page.getByTestId("client-sidebar");
    await expect(sidebar).toBeVisible();
    await expect.poll(() => sidebar.evaluate((element) => getComputedStyle(element).backgroundColor)).toBe("rgb(255, 252, 250)");
  }
  const heroBox = await page.getByTestId("home-hero").boundingBox();
  if (isMobile) expect(heroBox?.height || Number.POSITIVE_INFINITY).toBeLessThanOrEqual(240);
  else expect(heroBox?.height || 0).toBeGreaterThanOrEqual(340);
  const bestsellerRail = page.getByTestId("home-bestseller-rail");
  await expect(bestsellerRail).toBeVisible();
  await expectLoadedProductImages(bestsellerRail.getByRole("img"));
  const visibleProducts = await bestsellerRail.locator(":scope > div:visible").count();
  expect(visibleProducts).toBeGreaterThanOrEqual(isMobile ? 4 : 5);
  const railDisplay = await bestsellerRail.evaluate((element) => getComputedStyle(element).display);
  if (isMobile) {
    expect(railDisplay).toBe("flex");
    expect(await bestsellerRail.evaluate((element) => element.scrollWidth)).toBeGreaterThan(await bestsellerRail.evaluate((element) => element.clientWidth));
  } else {
    expect(railDisplay).toBe("grid");
    const columnCount = await bestsellerRail.evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(" ").length);
    expect(columnCount).toBe(5);
  }
  if (process.env.CLIENT_SCREENSHOTS) {
    await page.screenshot({ path: `output/playwright/audit/home-reference-${isMobile ? "mobile" : "desktop"}.png`, scale: "css" });
  }

  await page.getByRole("button", { name: /catégories|categories|acheter les produits|shop products/i }).first().click();
  await expect(page.getByRole("heading", { name: /marché je mange africain|je mange africain market/i })).toBeVisible();
  await expect(page.getByLabel(/rechercher dans le catalogue|search the catalogue/i)).toBeVisible();
  await expect(page.getByLabel(/trier les produits|sort products/i)).toBeVisible();
  await expect(page.locator("main img").first()).toBeVisible();
  const catalogueGrid = page.getByTestId("catalog-product-grid");
  await expect(catalogueGrid).toBeVisible();
  await expectLoadedProductImages(catalogueGrid.getByRole("img"));
  const catalogueColumns = await catalogueGrid.evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(" ").length);
  expect(catalogueColumns).toBe(isMobile ? 2 : 4);
  if (process.env.CLIENT_SCREENSHOTS) {
    await page.screenshot({ path: `output/playwright/audit/catalog-reference-${isMobile ? "mobile" : "desktop"}.png`, scale: "css" });
  }
  if (isMobile) {
    await page.getByRole("button", { name: /filtres/i }).click();
    const filtersDialog = page.getByRole("dialog");
    await filtersDialog.getByRole("button", { name: /manioc & dérivés|cassava & derivatives/i }).click();
    await filtersDialog.getByRole("button", { name: /voir \d+ produits|view \d+ products/i }).click();
    await expect(page.getByRole("button", { name: /filtres, 1|filters, 1/i })).toBeVisible();
  } else {
    await page.getByTestId("catalog-filter-sidebar").getByRole("button", { name: /manioc & dérivés|cassava & derivatives/i }).click();
  }
  const clearCategoryFilter = page.getByRole("button", { name: /retirer le filtre manioc & dérivés|remove cassava & derivatives filter/i });
  await expect(clearCategoryFilter).toBeVisible();
  await clearCategoryFilter.click();
  if (isMobile) await expect(page.getByRole("button", { name: /^filtres$|^filters$/i })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expectNoSeriousA11yViolations(page);

  await page.getByRole("button", { name: /recettes|cuisiner une recette|cook a recipe/i }).first().click();
  await expect(page.getByRole("heading", { name: /moteur de recettes africaines|african recipe engine/i })).toBeVisible();
  await expect(page.getByRole("tab", { name: /atlas des plats|dish atlas/i })).toBeVisible();
  await expect(page.getByLabel(/rechercher une recette ou un plat|search for a recipe or dish/i)).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThanOrEqual(1);
  const recipeHeroBox = await page.getByTestId("recipes-hero").boundingBox();
  if (isMobile) expect(recipeHeroBox?.height || Number.POSITIVE_INFINITY).toBeLessThanOrEqual(250);
  else {
    expect(recipeHeroBox?.height || Number.POSITIVE_INFINITY).toBeLessThanOrEqual(280);
    expect(recipeHeroBox?.height || 0).toBeGreaterThanOrEqual(240);
  }
  const recipeGrid = page.getByTestId("recipes-grid");
  await expect(recipeGrid).toBeVisible();
  await expectLoadedProductImages(recipeGrid.getByRole("img"));
  const recipeColumns = await recipeGrid.evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(" ").length);
  expect(recipeColumns).toBe(isMobile ? 2 : 3);
  if (process.env.CLIENT_SCREENSHOTS) {
    await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: "auto" }));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThanOrEqual(1);
    const headingBox = await page.getByRole("heading", { name: /moteur de recettes africaines|african recipe engine/i }).boundingBox();
    const visibleHeroBox = await page.getByTestId("recipes-hero").boundingBox();
    expect(headingBox?.y || 0).toBeGreaterThanOrEqual((visibleHeroBox?.y || 0) - 1);
    await page.screenshot({ path: `output/playwright/audit/recipes-reference-${isMobile ? "mobile" : "desktop"}.png`, scale: "css" });
  }
  await page.getByRole("tab", { name: /atlas des plats|dish atlas/i }).click();
  const dishGrid = page.getByTestId("dish-library-grid");
  await expect(dishGrid).toBeVisible();
  await expect(page.getByRole("heading", { name: /explorez les plats par origine|explore dishes by origin/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /toute l'afrique|all africa/i })).toHaveAttribute("aria-pressed", "true");
  await expectLoadedProductImages(dishGrid.getByRole("img"));
  const dishColumns = await dishGrid.evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(" ").length);
  expect(dishColumns).toBe(isMobile ? 2 : 3);
  await expectNoHorizontalOverflow(page);
  await expectBrandSafeUiColors(page);
  if (process.env.CLIENT_SCREENSHOTS) {
    await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: "auto" }));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: `output/playwright/audit/dish-atlas-reference-${isMobile ? "mobile" : "desktop"}.png`, scale: "css" });
  }
  await dishGrid.getByRole("button", { name: /voir la fiche|view record/i }).first().click();
  const dishDialog = page.getByRole("dialog");
  await expect(dishDialog.getByRole("heading", { name: /ingrédients|ingredients/i })).toBeVisible();
  await expect(dishDialog.getByRole("heading", { name: /préparation|preparation/i })).toBeVisible();
  await expectLoadedProductImages(dishDialog.getByRole("img"), 1);
  await expectNoHorizontalOverflow(page, dishDialog);
  await expectBrandSafeUiColors(page);
  if (process.env.CLIENT_SCREENSHOTS) await page.screenshot({ path: `output/playwright/audit/dish-details-reference-${isMobile ? "mobile" : "desktop"}.png`, scale: "css" });
  await page.keyboard.press("Escape");
  await expect(dishDialog).toBeHidden();

  await page.getByRole("button", { name: /^(panier|cart)$|^(finaliser le panier|complete basket)\b/i }).first().click();
  await expect(page.getByText(/votre panier est vide|your cart is empty/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /choisir une recette|choose a recipe/i })).toBeVisible();
  await expect(page.getByText(/stock vérifié|verified stock/i)).toBeVisible();
  if (process.env.CLIENT_SCREENSHOTS) {
    await page.screenshot({ path: `output/playwright/audit/cart-empty-reference-${isMobile ? "mobile" : "desktop"}.png`, scale: "css" });
  }
  await expectNoHorizontalOverflow(page);
});

test("the adaptive client navigation keeps every destination clear and touch friendly", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const isMobile = (page.viewportSize()?.width || 0) < 768;
  const navigation = page.getByTestId(isMobile ? "mobile-navigation" : "client-sidebar");
  await expect(navigation).toBeVisible();

  const activeItem = navigation.locator('button[aria-current="page"]');
  await expect(activeItem).toHaveCount(1);
  await expect(activeItem).toContainText(isMobile ? /accueil|home/i : /découvrir|discover/i);
  await expect(activeItem).toHaveAttribute("data-active", "true");

  if (isMobile) {
    const destinationButtons = navigation.locator(":scope > div > button");
    await expect(destinationButtons).toHaveCount(5);
    const targets = await destinationButtons.evaluateAll((buttons) => buttons.map((button) => {
      const box = button.getBoundingClientRect();
      return { width: box.width, height: box.height };
    }));
    expect(targets.every(({ width, height }) => width >= 44 && height >= 44)).toBe(true);
    await navigation.getByRole("button", { name: /catégories|categories/i }).click();
    await expect(navigation.locator('button[aria-current="page"]')).toContainText(/catégories|categories/i);
  } else {
    await navigation.getByRole("button", { name: /acheter les produits|shop products/i }).click();
    await expect(navigation.locator('button[aria-current="page"]')).toContainText(/acheter les produits|shop products/i);
    await expect(navigation.getByText(/rayons, origine et disponibilité|categories, origin and availability/i)).toBeVisible();
  }

  await expect(page.getByRole("heading", { name: /marché je mange africain|je mange africain market/i })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expectBrandSafeUiColors(page);
  await expectNoSeriousA11yViolations(page);
});

test("the wholesale market applies volume pricing and preserves case quantities in the basket", async ({ page }) => {
  let quotePayload: { message?: string } | null = null;
  const wholesaleProduct = {
    id: "wholesale-attieke",
    sku: "JMA-WHO-ATT",
    name: "Attiéké professionnel",
    nameFr: "Attiéké professionnel",
    nameEn: "Professional attieke",
    traditionalName: "Attiéké",
    description: "Semoule de manioc fraîche pour restaurants et traiteurs.",
    country: "Côte d'Ivoire",
    price: 6,
    packaging: "Sachet 500 g",
    netWeightGrams: 500,
    thermalClass: "REFRIGERATED",
    imageUrl: "/products/attieke.webp",
    imageColor: "#F7F2F1",
    imageEmoji: "",
    isWholesale: true,
    wholesalePackLabel: "Carton de 6 sachets",
    wholesaleUnitsPerPack: 6,
    wholesaleMinPacks: 1,
    wholesalePrice: 32,
    wholesaleAvailablePacks: 12,
    wholesaleDiscountPercent: 11,
    wholesaleTiers: [{ minPacks: 1, price: 32 }, { minPacks: 5, price: 30 }, { minPacks: 10, price: 28 }],
    category: { id: "staples", name: "Féculents" },
  };
  await page.route("**/api/catalog?*", async (route) => {
    if (!route.request().url().includes("channel=wholesale")) return route.continue();
    const english = route.request().url().includes("locale=en");
    const localizedProduct = { ...wholesaleProduct, name: english ? wholesaleProduct.nameEn : wholesaleProduct.nameFr, description: english ? "Fresh cassava semolina for restaurants and caterers." : wholesaleProduct.description };
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ products: [localizedProduct], total: 1, page: 1, pageSize: 48, pages: 1, filters: { categories: [wholesaleProduct.category], brands: [], countries: ["Côte d'Ivoire"] } }) });
  });
  await page.route("**/api/contact", async (route) => {
    quotePayload = route.request().postDataJSON();
    await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ ok: true, reference: "JMA-PRO-2042" }) });
  });

  await page.goto("/?view=wholesale", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1, name: /marché de gros|wholesale market/i })).toBeVisible();
  await expect(page.getByText(/semoule de manioc fraîche|fresh cassava semolina/i)).toBeVisible();
  const grid = page.getByTestId("wholesale-product-grid");
  await expect(grid).toBeVisible();
  const isMobile = (page.viewportSize()?.width || 0) < 768;
  const columns = await grid.evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(" ").length);
  expect(columns).toBe(isMobile ? 2 : 4);
  const wholesaleImage = grid.getByRole("img", { name: "Attiéké professionnel" });
  await expect(wholesaleImage).toBeVisible();
  await expect.poll(() => wholesaleImage.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  const productCard = grid.getByTestId("wholesale-product-card").first();
  const productCardBox = await productCard.boundingBox();
  expect(productCardBox?.y || Number.POSITIVE_INFINITY).toBeLessThan(isMobile ? 530 : 560);
  await expect(productCard.getByText(/12 colis disponibles|12 cases available/i)).toBeVisible();
  await expect(productCard.getByText(/encore 4 pour 30,00\s*€|4 more for €30\.00/i)).toBeVisible();
  await expectBrandSafeUiColors(page);
  if (process.env.CLIENT_SCREENSHOTS) {
    await page.screenshot({ path: `output/playwright/audit/wholesale-market-${isMobile ? "mobile" : "desktop"}.png`, scale: "css" });
  }
  await page.getByRole("button", { name: /demander un devis|request a quote/i }).click();
  const quoteDialog = page.getByRole("dialog", { name: /demande de devis professionnel|professional quote request/i });
  await expect(quoteDialog.getByLabel(/entreprise|company/i)).toBeVisible();
  await quoteDialog.getByRole("button", { name: /annuler|cancel/i }).click();
  await expect(quoteDialog).toBeHidden();
  await page.locator("[data-testid=wholesale-product-card] select").selectOption("5");
  await expect(page.getByText(/30,00\s*€|€30\.00/).first()).toBeVisible();
  const economics = productCard.getByTestId("wholesale-line-economics");
  await expect(economics).toContainText(/150,00\s*€|€150\.00/);
  await expect(economics).toContainText(/économisez 30,00\s*€ \(17 %\)|save €30\.00 \(17%\)/i);
  await expect(productCard.getByText(/encore 5 pour 28,00\s*€|5 more for €28\.00/i)).toBeVisible();
  if (process.env.CLIENT_SCREENSHOTS) {
    await productCard.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `output/playwright/audit/wholesale-economics-${isMobile ? "mobile" : "desktop"}.png`, scale: "css" });
  }
  await productCard.getByRole("button", { name: /ajouter .* au devis|add .* to quote/i }).click();
  const selectedQuoteButton = page.getByRole("button", { name: /ouvrir le devis, 1 produit.*5 colis|open quote, 1 product.*5 cases/i });
  await expect(selectedQuoteButton).toBeVisible();
  await selectedQuoteButton.click();
  const selectedQuoteDialog = page.getByRole("dialog", { name: /demande de devis professionnel|professional quote request/i });
  const quoteSelection = selectedQuoteDialog.getByTestId("wholesale-quote-selection");
  await expect(quoteSelection).toContainText("Attiéké professionnel");
  await expect(quoteSelection).toContainText(/150,00\s*€|€150\.00/);
  await expectLoadedProductImages(quoteSelection.getByRole("img", { name: "Attiéké professionnel" }), 1);
  await quoteSelection.getByRole("button", { name: /diminuer attiéké|decrease professional attieke/i }).click();
  await expect(quoteSelection).toContainText(/128,00\s*€|€128\.00/);
  await selectedQuoteDialog.getByLabel(/entreprise|company/i).fill("Maison Awa");
  await selectedQuoteDialog.getByLabel(/^contact$/i).fill("Awa Traore");
  await selectedQuoteDialog.getByLabel(/^email$/i).fill("awa@maison.example");
  await selectedQuoteDialog.getByLabel(/téléphone|phone/i).fill("+33612345678");
  await selectedQuoteDialog.getByLabel(/contraintes de livraison|delivery requirements/i).fill("Livraison réfrigérée le mardi matin.");
  if (process.env.CLIENT_SCREENSHOTS) {
    await page.screenshot({ path: `output/playwright/audit/wholesale-quote-${isMobile ? "mobile" : "desktop"}.png`, scale: "css" });
  }
  await selectedQuoteDialog.getByRole("button", { name: /envoyer la demande|send request/i }).click();
  await expect(selectedQuoteDialog).toContainText("JMA-PRO-2042");
  await expect.poll(() => quotePayload?.message || "").toContain("Attiéké professionnel: 4 x Carton de 6 sachets = 128,00 €");
  await selectedQuoteDialog.getByRole("button", { name: "Fermer", exact: true }).click();
  await page.getByRole("button", { name: /^(ajouter|add)$/i }).click();
  await page.getByRole("button", { name: /passer la plateforme en anglais|switch the platform to french/i }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Wholesale market" })).toBeVisible();
  await page.getByRole("button", { name: /^(panier|cart)$|^(finaliser le panier|complete basket)\b/i }).first().click();
  await expect(page.getByText("Professional attieke", { exact: true })).toBeVisible();
  await expect(page.getByText(/^(gros|wholesale)$/i)).toBeVisible();
  await expect(page.locator("#main-content").getByText("5", { exact: true })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expectNoSeriousA11yViolations(page);
});

test("global search and notifications navigate to useful client destinations", async ({ page }) => {
  const current = new Date();
  const todayAtNoon = new Date(current.getFullYear(), current.getMonth(), current.getDate(), 12).toISOString();
  const yesterdayAtNoon = new Date(current.getFullYear(), current.getMonth(), current.getDate() - 1, 12).toISOString();
  await page.route("**/api/push/config", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ configured: false, publicKey: null }) }));
  await page.route("**/api/notifications?*", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ notifications: [
      { id: "notice-order", type: "order", title: "Votre commande avance", body: "JMA-260902-0098 est en cours de livraison.", url: "/?view=orders", createdAt: todayAtNoon },
      { id: "notice-recipe", type: "recipe", title: "Une nouvelle recette", body: "Découvrez le kedjenou de poulet.", url: "/?view=recipes&recipeMode=library&query=kedjenou", createdAt: yesterdayAtNoon },
    ] }),
  }));
  await page.route("**/api/search?*", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      results: [{ kind: "product", id: "product-search", name: "Attiéké frais", traditionalName: "Attiéké", emoji: "", imageUrl: "/products/attieke.webp", color: "#F7F2F1", price: 7.5, promoPrice: null, country: "Côte d'Ivoire", thermalClass: "REFRIGERATED", packaging: "Sachet 500 g", availableStock: 14, category: { id: "cat-1", slug: "feculents", name: "Féculents", color: "#D65A32" }, matchedAlias: null }],
      recipes: [{ kind: "recipe", id: "recipe-search", slug: "kedjenou", name: "Kedjenou de poulet", emoji: "", imageUrl: "/hero-feast-v2.webp", color: "#8A3042", country: "Côte d'Ivoire", category: "Plats", difficulty: "easy", timeMinutes: 55, baseServings: 4, description: "Poulet mijoté doucement avec tomate et aromates." }],
      dishes: [{ kind: "dish", slug: "mafe", name: "Mafé", country: "Mali", region: "Bamako", categoryLabel: "Sauces", difficulty: "easy", timeMinutes: 60, servings: 4, description: "Sauce onctueuse à l'arachide.", imageUrl: "/recipes/mafe.webp" }],
    }),
  }));
  await page.route("**/api/products/product-search?*", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ id: "product-search", name: "Attiéké frais", traditionalName: "Attiéké", description: "Semoule de manioc prête à accompagner vos plats.", country: "Côte d'Ivoire", thermalClass: "REFRIGERATED", packaging: "Sachet 500 g", netWeightGrams: 500, stockQty: 14, alertThreshold: 5, imageColor: "#F7F2F1", imageEmoji: "", imageUrl: "/products/attieke.webp", galleryUrls: [], price: 7.5, promoPrice: null, pricePerKg: 15, isBestseller: false, isNew: false, isOnSale: false, variants: [], aliases: ["Attiéké"], ingredients: "Manioc", allergens: null, preparation: "Réchauffer doucement.", storage: "Conserver au frais.", storageTempC: "4°C", nutrition: null, related: [], relatedRecipes: [] }),
  }));

  await page.goto("/", { waitUntil: "domcontentloaded" });
  const notificationsButton = page.getByRole("button", { name: /notifications, 2 (non lues|unread)/i });
  await expect(notificationsButton).toBeVisible();
  await notificationsButton.click();
  await expect(page.getByRole("heading", { name: "Notifications" }).last()).toBeVisible();
  await expect(page.getByText(/centre d’activité|activity centre/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /actualiser les notifications|refresh notifications/i })).toBeVisible();
  const notificationFilters = page.getByRole("tablist", { name: /filtrer les notifications|filter notifications/i });
  await expect(notificationFilters).toBeVisible();
  await expectNoHorizontalOverflow(page, notificationFilters);
  await notificationFilters.getByRole("tab", { name: /non lues 2|unread 2/i }).click();
  await expect(page.getByText(/aujourd’hui|today/i)).toBeVisible();
  await expect(page.getByText(/hier|yesterday/i)).toBeVisible();
  await expect(page.getByText("Votre commande avance")).toBeVisible();
  await expect(page.getByText("Une nouvelle recette")).toBeVisible();
  await notificationFilters.getByRole("tab", { name: /recettes 1|recipes 1/i }).click();
  await expect(page.getByText("Une nouvelle recette")).toBeVisible();
  await expect(page.getByText("Votre commande avance")).toBeHidden();
  await notificationFilters.getByRole("tab", { name: /toutes 2|all 2/i }).click();
  await expect(page.getByText("Votre commande avance")).toBeVisible();
  await expect(page.getByText(/commande|order/i).last()).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expectBrandSafeUiColors(page);
  await expectNoSeriousA11yViolations(page);
  if (process.env.CLIENT_SCREENSHOTS) {
    await page.screenshot({ path: `output/playwright/audit/notifications-center-${(page.viewportSize()?.width || 0) < 768 ? "mobile" : "desktop"}.png`, scale: "css" });
  }
  await page.getByRole("button", { name: /votre commande avance/i }).click();
  await expect(page.getByRole("heading", { name: /connectez-vous pour voir vos commandes|sign in to view your orders/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /notifications, 1 (non lues|unread)/i })).toBeVisible();

  await page.goto("/", { waitUntil: "domcontentloaded" });
  const search = page.getByRole("combobox", { name: /recherche globale|global search/i });
  await search.focus();
  await expect(page.getByText(/recherches populaires|popular searches/i)).toBeVisible();
  await search.fill("attiéké");
  await expect(page.getByRole("option", { name: /attiéké frais/i })).toBeVisible();
  await expect(page.getByText(/bibliothèque de plats|dish library/i)).toBeVisible();
  await expect(page.getByText(/disponible|in stock/i).first()).toBeVisible();
  await expect(page.getByTestId("search-destination-products")).toContainText(/produits|products/i);
  await expect(page.getByTestId("search-destination-products")).toContainText(/1 résultat|1 result/i);
  await expect(page.getByTestId("search-destination-kitchen")).toContainText(/recettes & plats|recipes & dishes/i);
  await expect(page.getByTestId("search-destination-kitchen")).toContainText(/2 inspirations|2 ideas/i);
  await expectLoadedProductImages(page.getByRole("option", { name: /mafé/i }).getByRole("img"), 1);
  await expectNoHorizontalOverflow(page, page.getByRole("listbox", { name: /suggestions de recherche|search suggestions/i }));
  await page.getByTestId("search-destination-kitchen").click();
  await expect(page).toHaveURL(/view=recipes/);
  expect(new URL(page.url()).searchParams.get("recipeMode")).toBe("recipes");
  expect(new URL(page.url()).searchParams.get("query")).toBe("attiéké");

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await search.fill("attiéké");
  await expect(page.getByRole("option", { name: /attiéké frais/i })).toBeVisible();
  await search.press("ArrowDown");
  await expect(page.getByRole("option", { name: /attiéké frais/i })).toHaveAttribute("aria-selected", "true");
  if (process.env.CLIENT_SCREENSHOTS) {
    await page.screenshot({ path: `output/playwright/audit/global-search-${(page.viewportSize()?.width || 0) < 768 ? "mobile" : "desktop"}.png`, scale: "css" });
  }
  await search.press("Enter");
  await expect(page.getByRole("heading", { level: 1, name: "Attiéké frais" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("product details stay bounded and preserve real visual identification in the basket", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /catégories|categories|acheter les produits|shop products/i }).first().click();
  await expect(page.getByRole("heading", { name: /marché je mange africain|je mange africain market/i })).toBeVisible();

  const firstProduct = page.locator("main h3").first();
  const productName = (await firstProduct.textContent())?.trim() || "";
  expect(productName).not.toBe("");
  const firstProductCard = page.getByRole("link", { name: `Voir ${productName}`, exact: true }).first();
  await firstProductCard.focus();
  await firstProductCard.press("Enter");

  await expect(page.getByRole("heading", { level: 1, name: productName })).toBeVisible();
  await expect(page).toHaveURL(/\?view=product&productId=[^&]+/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\?view=product&productId=[^&]+/);
  const productSchema = JSON.parse((await page.locator('script[id^="jma-structured-product-"]').textContent()) || "{}");
  expect(productSchema["@type"]).toBe("Product");
  expect(productSchema.name).toBe(productName);
  expect(productSchema.offers.priceCurrency).toBe("EUR");
  expect(productSchema.image.length).toBeGreaterThan(0);
  await expect(page.getByRole("button", { name: /retour|back/i })).toHaveCount(1);
  await expect(page.locator("main img").first()).toBeVisible();
  await expect(page.getByRole("tab", { name: /description/i })).toBeVisible();
  await expect(page.getByRole("tab", { name: /nutrition/i })).toBeVisible();
  await expect(page.getByRole("tab", { name: /préparation|preparation/i })).toBeVisible();
  await expect(page.getByRole("tab", { name: /conservation|storage/i })).toBeVisible();
  const isMobile = (page.viewportSize()?.width || 0) < 768;
  const purchaseDock = page.getByTestId("product-purchase-dock");
  if (isMobile) {
    await expect(purchaseDock).toBeVisible();
    const dockBox = await purchaseDock.boundingBox();
    const navigationBox = await page.getByTestId("mobile-navigation").boundingBox();
    expect(Math.abs((dockBox?.y || 0) + (dockBox?.height || 0) - (navigationBox?.y || 0))).toBeLessThanOrEqual(2);
  } else {
    await expect(purchaseDock).toBeHidden();
  }
  await expectNoHorizontalOverflow(page);
  const relatedRecipesHeading = page.getByRole("heading", { name: /recettes associées|related recipes/i });
  if (await relatedRecipesHeading.count()) {
    await relatedRecipesHeading.scrollIntoViewIfNeeded();
    const relatedRecipeImage = relatedRecipesHeading.locator("xpath=following-sibling::*[1]").getByRole("img").first();
    await expect(relatedRecipeImage).toBeVisible();
    await expect.poll(() => relatedRecipeImage.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
  }
  if (process.env.CLIENT_SCREENSHOTS) {
    await page.screenshot({ path: `output/playwright/audit/product-detail-${isMobile ? "mobile" : "desktop"}.png`, fullPage: true, scale: "css" });
  }

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1, name: productName })).toBeVisible();
  await expect(page).toHaveURL(/\?view=product&productId=[^&]+/);

  const largerVariant = page.getByRole("button", { name: /Pot 800 g/i });
  await expect(largerVariant).toContainText(/9,90\s*€/);
  await largerVariant.click();
  const addToCart = isMobile
    ? purchaseDock.getByRole("button", { name: /ajouter au panier|add to cart/i })
    : page.getByRole("button", { name: /ajouter au panier|add to cart/i }).first();
  await expect(addToCart).toContainText(/9,90\s*€/);
  await addToCart.click();
  await page.getByRole("button", { name: /^(panier|cart)$|^(finaliser le panier|complete basket)\b/i }).first().click();
  await expect(page.getByRole("heading", { name: /mon panier|my cart/i })).toBeVisible();
  await expect(page.getByText(productName, { exact: true })).toBeVisible();
  await expect(page.getByText("Pot 800 g", { exact: true })).toBeVisible();
  await expect(page.getByRole("img", { name: productName })).toBeVisible();
  await page.getByRole("button", { name: /passer la commande|checkout/i }).click();
  await expect(page.getByRole("heading", { name: /connectez-vous avant de finaliser|sign in before checkout/i })).toBeVisible();
  await page.locator("#main-content").getByRole("button", { name: /connexion|sign in/i }).click();
  const checkoutAuth = page.getByRole("dialog");
  await expect(checkoutAuth.getByText(/votre panier vous attend|your basket is waiting/i)).toBeVisible();
  await checkoutAuth.getByRole("button", { name: /fermer la connexion|close sign-in/i }).click();
  await expect(page.getByRole("heading", { name: /mon panier|my cart/i })).toBeVisible();
  await expect(page.getByText(productName, { exact: true })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("customer sign-in accepts a phone number and resumes the intended workspace", async ({ page }) => {
  const customer = { id: "customer-login", email: "awa@example.fr", phone: "+33612345678", firstName: "Awa", lastName: "Koné", role: "customer", loyaltyPoints: 120, walletCredit: 0 };
  let credentials: { identifier?: string; password?: string } | undefined;
  await page.route("**/api/auth/customer/session", async (route) => {
    if (route.request().method() === "POST") {
      credentials = route.request().postDataJSON();
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ customer, addresses: [], favoriteProductIds: [], savedRecipeIds: [] }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ customer: null }) });
  });
  await page.route("**/api/orders?*", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ orders: [] }) }));

  await page.goto("/?view=account&returnView=orders", { waitUntil: "domcontentloaded" });
  const loginForm = page.getByRole("form", { name: /formulaire de connexion|sign-in form/i });
  await expect(loginForm).toBeVisible();
  await loginForm.getByLabel(/e-mail ou numéro de téléphone|email or phone number/i).fill("+33 6 12 34 56 78");
  await loginForm.getByRole("textbox", { name: /^(mot de passe|password)$/i }).fill("motdepasse-solide");
  await loginForm.getByRole("button", { name: /connexion|sign in/i }).click();

  await expect(page.getByRole("heading", { name: /mes commandes|my orders/i })).toBeVisible();
  await expect(page).toHaveURL(/view=orders/);
  expect(credentials).toEqual({ identifier: "+33 6 12 34 56 78", password: "motdepasse-solide" });
  await expect(page.getByRole("dialog")).toBeHidden();
  await expectNoHorizontalOverflow(page);
  await expectNoSeriousA11yViolations(page);
});

test("registration requires legal consent and two independently visible passwords", async ({ page }) => {
  let recoveryRequest: { email?: string } | undefined;
  await page.route("**/api/auth/customer/register", (route) => route.fulfill({
    status: 503,
    contentType: "application/json",
    body: JSON.stringify({ error: "L'inscription client n'est pas configurée." }),
  }));
  await page.route("**/api/auth/customer/password", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    recoveryRequest = route.request().postDataJSON();
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
  });
  await page.goto("/?view=account", { waitUntil: "domcontentloaded" });
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByTestId("customer-auth-workspace")).toBeVisible();
  await expect(dialog.getByText(/commandes|orders/i).last()).toBeVisible();
  await expect(dialog.getByText(/favoris|saved/i).last()).toBeVisible();
  await expect(dialog.getByText(/adresses|addresses/i).last()).toBeVisible();
  const isMobile = (page.viewportSize()?.width || 0) < 768;
  if (isMobile) {
    const mobileBrand = dialog.getByTestId("customer-auth-mobile-brand");
    await expect(mobileBrand).toBeVisible();
    await expect.poll(() => mobileBrand.locator("img").evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  } else {
    const authVisual = dialog.getByTestId("customer-auth-visual");
    await expect(authVisual).toBeVisible();
    await expect.poll(() => authVisual.locator("img").first().evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
    await expect(dialog.getByTestId("customer-auth-overlay")).toHaveClass(/bg-burgundy\/45/);
    await expect(authVisual.getByText("Commandes suivies")).toBeVisible();
    await expect(authVisual.getByText("Recettes synchronisées")).toBeVisible();
    await expect(authVisual.getByText("Accès protégé")).toBeVisible();
  }
  await expect(dialog).not.toContainText(/console professionnelle|professional console|administration/i);
  if (process.env.CLIENT_SCREENSHOTS) {
    await page.screenshot({ path: `output/playwright/audit/auth-login-${isMobile ? "mobile" : "desktop"}.png`, scale: "css" });
  }
  const languageSwitch = dialog.getByRole("button", { name: /passer la plateforme en anglais/i });
  await expect(languageSwitch).toBeVisible();
  await languageSwitch.click();
  await expect(dialog.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await expect(page).toHaveTitle("My account | Je mange Africain");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator(".jma-skip-link")).toHaveText("Skip to main content");
  await expect(dialog).toContainText("Food & groceries");
  await expect(dialog.getByLabel("Email or phone number")).toHaveAttribute("placeholder", "you@example.com or +44...");
  await expect(dialog.getByRole("link", { name: "terms", exact: true })).toHaveAttribute("href", "/conditions-generales?lang=en");
  await expect(dialog.getByRole("link", { name: "privacy policy", exact: true })).toHaveAttribute("href", "/confidentialite?lang=en");
  await dialog.getByRole("button", { name: /switch the platform to french/i }).click();
  await page.getByRole("tab", { name: /inscription|register/i }).click();
  const registrationProgress = page.getByRole("progressbar", { name: /progression de l'inscription|registration progress/i });
  await expect(registrationProgress).toHaveAttribute("aria-valuenow", "0");

  const password = page.getByLabel(/mot de passe \(8 caractères minimum\)|password \(8 characters minimum\)/i);
  const confirmation = page.getByLabel(/confirmer le mot de passe|confirm password/i);
  await expect(password).toHaveAttribute("type", "password");
  await expect(confirmation).toHaveAttribute("type", "password");
  await expect(page.getByRole("button", { name: /créer mon compte|create my account/i })).toBeDisabled();

  const showButtons = page.getByRole("button", { name: /afficher le mot de passe|show password/i });
  await expect(showButtons).toHaveCount(2);
  await showButtons.first().click();
  await expect(password).toHaveAttribute("type", "text");
  await expect(confirmation).toHaveAttribute("type", "password");

  await password.fill("motdepasse-solide");
  await confirmation.fill("motdepasse-different");
  await expect(page.getByText("Les mots de passe ne correspondent pas.")).toBeVisible();
  await expect(page.getByRole("button", { name: /créer mon compte|create my account/i })).toBeDisabled();
  await confirmation.fill("motdepasse-solide");
  await expect(page.getByText("Les mots de passe correspondent.")).toBeVisible();
  await expect(registrationProgress).toHaveAttribute("aria-valuenow", "33");
  await page.getByLabel(/prénom|first name/i).fill("Awa");
  await page.getByLabel(/^nom$|last name/i).fill("Koné");
  await page.getByLabel(/^e-mail$/i).fill("awa.kone@example.fr");
  await page.getByLabel(/numéro de téléphone|phone number/i).fill("+33 6 12 34 56 78");
  await expect(registrationProgress).toHaveAttribute("aria-valuenow", "67");

  await page.getByRole("checkbox", { name: /conditions générales|terms of use/i }).click();
  await expect(page.getByRole("button", { name: /créer mon compte|create my account/i })).toBeDisabled();
  await page.getByRole("checkbox", { name: /politique de confidentialité|privacy policy/i }).click();
  await expect(page.getByRole("button", { name: /créer mon compte|create my account/i })).toBeEnabled();
  await expect(registrationProgress).toHaveAttribute("aria-valuenow", "100");
  await expect(page.getByText("Votre dossier est prêt")).toBeVisible();
  const brandNameBox = await dialog.locator(".font-brand").first().boundingBox();
  expect((brandNameBox?.x || 0) + (brandNameBox?.width || 0)).toBeLessThanOrEqual(page.viewportSize()?.width || 0);
  await expectNoHorizontalOverflow(page, dialog);
  await expectBrandSafeUiColors(page);
  await expectNoSeriousA11yViolations(page);
  if (process.env.CLIENT_SCREENSHOTS) {
    await dialog.getByTestId("customer-auth-form-scroll").evaluate((element) => element.scrollTo({ top: 0, behavior: "instant" }));
    await page.screenshot({ path: `output/playwright/audit/auth-register-${(page.viewportSize()?.width || 0) < 768 ? "mobile" : "desktop"}.png`, fullPage: true, scale: "css" });
  }

  await page.getByRole("button", { name: /créer mon compte|create my account/i }).click();
  await expect(page.getByRole("alert")).toContainText("Inscription momentanément indisponible.");
  await expect(dialog).not.toContainText(/configuré|supabase|api key/i);

  await page.getByRole("tab", { name: /connexion|sign in/i }).click();
  await dialog.getByRole("button", { name: /mot de passe oublié|forgot password/i }).click();
  await expect(dialog.getByRole("heading", { name: /retrouvez l'accès à votre compte|recover access to your account/i })).toBeVisible();
  await expect(dialog.getByLabel(/étapes de récupération|recovery steps/i)).toBeVisible();
  await dialog.getByLabel(/^e-mail$/i).fill("awa.kone@example.fr");
  await dialog.getByRole("button", { name: /envoyer le lien sécurisé|send secure link/i }).click();
  await expect(dialog.getByRole("status")).toContainText(/un lien de modification vient d'être envoyé|a reset link has just been sent/i);
  expect(recoveryRequest).toEqual({ email: "awa.kone@example.fr" });
  await expectNoHorizontalOverflow(page, dialog);
  await expectNoSeriousA11yViolations(page);
  if (process.env.CLIENT_SCREENSHOTS) {
    await dialog.getByTestId("customer-auth-form-scroll").evaluate((element) => element.scrollTo({ top: 0, behavior: "instant" }));
    await page.screenshot({ path: `output/playwright/audit/auth-recovery-${isMobile ? "mobile" : "desktop"}.png`, scale: "css" });
  }

  await page.getByRole("button", { name: /fermer la connexion|close sign-in/i }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByRole("main")).toBeVisible();
});

test("password recovery remains bilingual, branded and independently visible", async ({ page }) => {
  let resetPayload: { accessToken?: string; password?: string } | undefined;
  await page.route("**/api/auth/customer/password", async (route) => {
    if (route.request().method() !== "PUT") return route.continue();
    resetPayload = route.request().postDataJSON();
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true }) });
  });

  await page.goto("/auth/reset#access_token=reset-token", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { level: 1, name: "Nouveau mot de passe" })).toBeVisible();
  await expect(page.getByTestId("reset-auth-workspace")).toBeVisible();
  await expect(page.locator("body")).not.toContainText(/console professionnelle|professional console|administration/i);
  const isMobile = (page.viewportSize()?.width || 0) < 768;
  if (isMobile) {
    const mobileBrand = page.getByTestId("reset-auth-mobile-brand");
    await expect(mobileBrand).toBeVisible();
    await expect.poll(() => mobileBrand.locator("img").evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  } else {
    const authVisual = page.getByTestId("customer-auth-visual");
    await expect(authVisual).toBeVisible();
    await expect.poll(() => authVisual.locator("img").first().evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
    await expect(page.getByTestId("customer-auth-overlay")).toHaveClass(/bg-burgundy\/45/);
    await expect(authVisual.getByText("Commandes suivies")).toBeVisible();
    await expect(authVisual.getByText("Recettes synchronisées")).toBeVisible();
  }
  const resetJourney = page.getByTestId("reset-journey");
  await expect(resetJourney.getByRole("listitem").nth(1)).toHaveAttribute("aria-current", "step");

  await page.getByRole("button", { name: /passer la plateforme en anglais/i }).click();
  await expect(page.getByRole("heading", { level: 1, name: "New password" })).toBeVisible();
  await expect(page).toHaveTitle("New password | Je mange Africain");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator(".jma-skip-link")).toHaveText("Skip to main content");
  const resetForm = page.getByRole("form", { name: "New password form" });
  const password = resetForm.getByLabel("New password");
  const confirmation = resetForm.getByLabel("Confirm password");
  const updateButton = resetForm.getByRole("button", { name: "Update password" });
  await expect(password).toHaveAttribute("type", "password");
  await expect(confirmation).toHaveAttribute("type", "password");
  await expect(updateButton).toBeDisabled();

  const visibilityControls = resetForm.getByRole("button", { name: "Show password" });
  await expect(visibilityControls).toHaveCount(2);
  await visibilityControls.first().click();
  await expect(password).toHaveAttribute("type", "text");
  await expect(confirmation).toHaveAttribute("type", "password");
  await password.fill("secure-password");
  await confirmation.fill("different-password");
  await expect(page.getByText("Passwords do not match.")).toBeVisible();
  await expect(updateButton).toBeDisabled();
  await confirmation.fill("secure-password");
  await expect(page.getByText("Passwords match.")).toBeVisible();
  await expect(page.getByText("Strong", { exact: true })).toBeVisible();
  await expect(updateButton).toBeEnabled();
  if (process.env.CLIENT_SCREENSHOTS) {
    await page.getByTestId("reset-auth-form-scroll").evaluate((element) => element.scrollTo({ top: 0, behavior: "instant" }));
    await page.screenshot({ path: `output/playwright/audit/auth-reset-form-${isMobile ? "mobile" : "desktop"}.png`, scale: "css" });
  }
  await updateButton.click();

  await expect(page.getByText("Your password has been updated. Your account is ready.")).toBeVisible();
  await expect(resetJourney.getByRole("listitem").nth(2)).toHaveAttribute("aria-current", "step");
  await expect(page.getByRole("list", { name: "Security confirmation" })).toContainText("New password saved");
  await expect(page.getByRole("list", { name: "Security confirmation" })).toContainText("Customer account ready");
  await expect(page.getByRole("link", { name: "Sign in", exact: true })).toHaveAttribute("href", "/?view=account");
  expect(resetPayload).toEqual({ accessToken: "reset-token", password: "secure-password" });
  await expectNoHorizontalOverflow(page);
  await expectBrandSafeUiColors(page);
  await expectNoSeriousA11yViolations(page);
  if (process.env.CLIENT_SCREENSHOTS) {
    await page.screenshot({ path: `output/playwright/audit/auth-reset-${isMobile ? "mobile" : "desktop"}.png`, scale: "css" });
  }

  await page.goto("/auth/reset", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { level: 2, name: "This link can no longer be used" })).toBeVisible();
  await expect(page.getByTestId("reset-journey").getByRole("listitem").first()).toHaveAttribute("aria-current", "step");
  await expect(page.getByRole("link", { name: "Request a new link" })).toHaveAttribute("href", "/?view=account");
  await expectNoHorizontalOverflow(page);
  await expectNoSeriousA11yViolations(page);
  if (process.env.CLIENT_SCREENSHOTS) {
    await page.screenshot({ path: `output/playwright/audit/auth-reset-invalid-${isMobile ? "mobile" : "desktop"}.png`, scale: "css" });
  }
});

test("public legal documents are bilingual, navigable and free of drafting notes", async ({ page }) => {
  await page.goto("/conditions-generales?lang=fr", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1, name: "Conditions générales d'utilisation et de vente" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(page.locator('[data-testid="legal-contents"]:visible')).toHaveText("Sommaire du document");
  await expect(page.getByText(/version contractuelle applicable/i)).toBeVisible();
  await expect(page.locator("body")).not.toContainText(/ce modèle doit|doit être complété|this template must/i);
  await expectNoHorizontalOverflow(page);
  await expectNoSeriousA11yViolations(page);
  if (process.env.CLIENT_SCREENSHOTS) {
    await page.screenshot({ path: `output/playwright/audit/legal-terms-${(page.viewportSize()?.width || 0) < 768 ? "mobile" : "desktop"}.png`, fullPage: true, scale: "css" });
  }

  await page.getByRole("link", { name: "EN", exact: true }).click();
  await expect(page).toHaveURL(/conditions-generales\?lang=en/);
  await expect(page.getByRole("heading", { level: 1, name: "Terms of use and sale" })).toBeVisible();
  await expect(page.locator('[data-testid="legal-contents"]:visible')).toHaveText("Document contents");
  await expect(page).toHaveTitle("Terms and conditions | Je mange Africain");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator(".jma-skip-link")).toHaveText("Skip to main content");
  await expect(page.getByText("Food & groceries", { exact: true })).toHaveCount(1);

  await page.goto("/confidentialite?lang=fr", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1, name: "Politique de confidentialité" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(page.getByText("confidentialite@je-mange-africain.com").first()).toBeVisible();
  await expectNoHorizontalOverflow(page);
  if (process.env.CLIENT_SCREENSHOTS) {
    await page.screenshot({ path: `output/playwright/audit/legal-privacy-${(page.viewportSize()?.width || 0) < 768 ? "mobile" : "desktop"}.png`, fullPage: true, scale: "css" });
  }
});

test("the customer workspace edits identity and manages a persistent address book", async ({ page }) => {
  let account = {
    customer: { id: "customer-account", email: "awa@example.fr", phone: "+33612345678", firstName: "Awa", lastName: "Traore", role: "customer", loyaltyPoints: 180, walletCredit: 12.5, preferredLang: "fr" },
    addresses: [{ id: "address-home", label: "Domicile", firstName: "Awa", lastName: "Traore", street: "12 rue des Cultures", postalCode: "75011", city: "Paris", country: "France", phone: "+33612345678", isDefault: true }],
  };

  await page.addInitScript(({ persistedCustomer, persistedAddresses }) => {
    localStorage.setItem("jma-store", JSON.stringify({
      state: { locale: "fr", cart: [], favorites: [], savedRecipes: [], recentlyViewed: [], customer: persistedCustomer, addresses: persistedAddresses, country: "France", postalCode: "75011", coupon: null },
      version: 0,
    }));
  }, { persistedCustomer: account.customer, persistedAddresses: account.addresses });

  await page.route("**/api/auth/customer/session", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(account) }));
  await page.route("**/api/orders?*", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ orders: [] }) }));
  await page.route("**/api/customer/account", async (route) => {
    if (route.request().method() === "PATCH") {
      const update = route.request().postDataJSON();
      account = { ...account, customer: { ...account.customer, ...update } };
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(account) });
  });
  await page.route("**/api/customer/account/addresses", async (route) => {
    const input = route.request().postDataJSON();
    account = { ...account, addresses: [...account.addresses.map((address) => ({ ...address, isDefault: input.isDefault ? false : address.isDefault })), { ...input, id: "address-office", isDefault: Boolean(input.isDefault) }] };
    await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify(account) });
  });
  await page.route("**/api/customer/account/addresses/*", async (route) => {
    const addressId = new URL(route.request().url()).pathname.split("/").at(-1);
    if (route.request().method() === "PATCH") {
      const input = route.request().postDataJSON();
      account = { ...account, addresses: account.addresses.map((address) => address.id === addressId ? { ...address, ...input } : { ...address, isDefault: input.isDefault ? false : address.isDefault }) };
    }
    if (route.request().method() === "DELETE") {
      const removedDefault = account.addresses.find((address) => address.id === addressId)?.isDefault;
      const remaining = account.addresses.filter((address) => address.id !== addressId);
      account = { ...account, addresses: removedDefault && remaining.length ? remaining.map((address, index) => ({ ...address, isDefault: index === 0 })) : remaining };
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(account) });
  });

  await page.goto("/?view=account", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Awa Traore" })).toBeVisible();
  await expect(page.getByRole("button", { name: /mes adresses|my addresses/i })).toBeVisible();
  const identityHeader = page.getByTestId("account-identity-header");
  await expect.poll(() => identityHeader.evaluate((element) => getComputedStyle(element).backgroundColor)).toBe("rgb(255, 248, 244)");
  await expect(page.getByTestId("account-command-summary")).toContainText("180 pts");
  await expect(page.getByTestId("account-command-summary")).toContainText(/commandes\s*0|orders\s*0/i);
  await expect(page.getByTestId("account-command-summary")).toContainText(/adresses\s*1|addresses\s*1/i);
  const accountNavigation = page.getByTestId("account-section-navigation");
  await expect(accountNavigation.locator('button[aria-current="page"]')).toHaveCount(1);
  await expect(accountNavigation.locator("button")).toHaveCount(4);
  await expect(page.getByRole("button", { name: /coordonnées à jour|details up to date/i })).toBeDisabled();

  await page.getByLabel(/prénom|first name/i).fill("Aminata");
  await expect(page.getByRole("button", { name: /enregistrer mes coordonnées|save my details/i })).toBeEnabled();
  await page.getByRole("button", { name: /enregistrer mes coordonnées|save my details/i }).click();
  await expect(page.getByText(/coordonnées sont à jour|contact details are up to date/i)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Aminata Traore" })).toBeVisible();

  await page.getByRole("button", { name: /mes adresses|my addresses/i }).click();
  await expect(page).toHaveURL(/accountSection=addresses/);
  await expect(page.getByRole("button", { name: /mes adresses|my addresses/i })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("button", { name: /mes adresses|my addresses/i })).toHaveAttribute("data-active", "true");
  await expect(accountNavigation).toHaveCSS("position", "sticky");
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /mes adresses|my addresses/i })).toBeVisible();
  await expect(page.getByText("12 rue des Cultures")).toBeVisible();
  await expect(page.getByText(/adresse proposée au paiement|address suggested at checkout/i)).toBeVisible();
  await page.getByRole("button", { name: /^ajouter( une adresse)?$|^add( address)?$/i }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(/nom de l'adresse|address name/i).fill("Bureau");
  await dialog.getByLabel(/adresse complète|street address/i).fill("8 avenue de l'Europe");
  await dialog.getByLabel(/code postal|postal code/i).fill("69002");
  await dialog.getByLabel(/ville|city/i).fill("Lyon");
  await dialog.getByRole("button", { name: /ajouter au carnet|add to address book/i }).click();
  await expect(page.getByRole("heading", { name: "Bureau" })).toBeVisible();
  await page.getByRole("button", { name: /définir par défaut|make default/i }).click();
  await expect(page.getByText(/Bureau · 69002 Lyon, France/i)).toBeVisible();

  await page.getByRole("button", { name: /supprimer l'adresse bureau|delete bureau address/i }).click();
  const confirmation = page.getByRole("alertdialog");
  await expect(confirmation.getByText(/commandes déjà passées conserveront|existing orders keep/i)).toBeVisible();
  await confirmation.getByRole("button", { name: /oui, supprimer|yes, delete/i }).click();
  await expect(page.getByRole("heading", { name: "Bureau" })).toHaveCount(0);

  if (process.env.CLIENT_SCREENSHOTS) {
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.screenshot({ path: `output/playwright/audit/account-workspace-${(page.viewportSize()?.width || 0) < 768 ? "mobile" : "desktop"}.png`, scale: "css" });
  }
  await expectNoHorizontalOverflow(page);
  await expectNoSeriousA11yViolations(page);
});

test("the personal library filters and synchronizes saved products and recipes", async ({ page }) => {
  const customer = { id: "customer-saved", email: "awa@example.fr", phone: "+33612345678", firstName: "Awa", lastName: "Traore", role: "customer", loyaltyPoints: 180, walletCredit: 12.5, preferredLang: "fr" };
  const account = { customer, addresses: [], favoriteProductIds: ["product-saved"], savedRecipeIds: ["recipe-saved"] };
  const product = { id: "product-saved", sku: "JMA-ATT-500", traditionalName: "Attiéké", name: "Attiéké frais", price: 7.5, promoPrice: null, pricePerKg: 15, stockQty: 14, alertThreshold: 5, country: "Côte d'Ivoire", category: { id: "cat-1", slug: "feculents", name: "Féculents", color: "#D65A32" }, description: "Semoule de manioc", imageUrl: "/products/attieke.webp", imageColor: "#F7F2F1", imageEmoji: "", isBestseller: true, isNew: false, isOnSale: false, thermalClass: "REFRIGERATED", packaging: "Sachet 500 g", variants: [] };
  const recipe = { id: "recipe-saved", slug: "kedjenou", title: "Kedjenou de poulet", description: "Poulet mijoté aux légumes et aux épices.", country: "Côte d'Ivoire", category: "Plats", difficulty: "easy", timeMinutes: 55, baseServings: 4, imageColor: "#F7F2F1", imageEmoji: "", imageUrl: "/recipes/kedjenou-poulet.webp", isPopular: true, ingredientCount: 8 };
  let savedState = { productIds: [product.id], recipeIds: [recipe.id] };

  await page.addInitScript(({ persistedCustomer }) => {
    localStorage.setItem("jma-store", JSON.stringify({
      state: { locale: "fr", cart: [], favorites: ["product-saved"], savedRecipes: ["recipe-saved"], savedOwnerId: persistedCustomer.id, recentlyViewed: [], customer: persistedCustomer, addresses: [], country: "France", postalCode: "75011", coupon: null },
      version: 0,
    }));
  }, { persistedCustomer: customer });

  await page.route("**/api/auth/customer/session", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(account) }));
  await page.route("**/api/customer/account", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(account) }));
  await page.route("**/api/orders?*", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ orders: [] }) }));
  await page.route("**/api/catalog?*", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ products: [product], total: 1, page: 1, pageSize: 100, pages: 1, filters: { categories: [], brands: [], countries: [] } }) }));
  await page.route("**/api/recipes?*", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ recipes: [recipe], categories: [] }) }));
  await page.route("**/api/customer/saved", async (route) => {
    if (route.request().method() === "PUT") savedState = route.request().postDataJSON();
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(savedState) });
  });

  await page.goto("/?view=account", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /^enregistrés$/i }).click();
  await expect(page.getByRole("heading", { name: /mes essentiels|my essentials/i })).toBeVisible();
  await expect(page.getByText(/synchronisé au compte|synced to account/i)).toBeVisible();
  await expect(page.getByRole("tab", { name: /mes favoris/i })).toContainText("1");
  await expect(page.getByRole("img", { name: "Attiéké frais" })).toBeVisible();
  const savedHeadingBox = await page.getByRole("heading", { name: /mes essentiels|my essentials/i }).boundingBox();
  const firstSavedImageBox = await page.getByRole("img", { name: "Attiéké frais" }).boundingBox();
  expect((firstSavedImageBox?.y || 0) - (savedHeadingBox?.y || 0)).toBeLessThan((page.viewportSize()?.width || 0) < 768 ? 390 : 310);
  await expectNoHorizontalOverflow(page);
  await expectNoSeriousA11yViolations(page);

  const savedSearch = page.getByLabel(/rechercher dans mes produits favoris|search favourite products/i);
  await savedSearch.fill("manioc introuvable");
  await expect(page.getByRole("heading", { name: /aucun produit trouvé|no product found/i })).toBeVisible();
  await page.getByRole("button", { name: /effacer la recherche|clear search/i }).first().click();
  await expect(page.getByRole("img", { name: "Attiéké frais" })).toBeVisible();

  await page.getByRole("tab", { name: /recettes sauvegardées|saved recipes/i }).click();
  await expect(page.getByText("Kedjenou de poulet", { exact: true })).toBeVisible();
  const recipeImage = page.getByRole("img", { name: "Kedjenou de poulet" });
  await expect(recipeImage).toBeVisible();
  await expect.poll(() => recipeImage.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  if (process.env.CLIENT_SCREENSHOTS) {
    await page.evaluate(() => {
      const heading = document.querySelector("#account-saved-title");
      if (!heading) return;
      const offset = window.innerWidth < 768 ? 124 : 84;
      window.scrollTo({ top: Math.max(0, heading.getBoundingClientRect().top + window.scrollY - offset), behavior: "instant" });
    });
    await page.screenshot({ path: `output/playwright/audit/saved-library-${(page.viewportSize()?.width || 0) < 768 ? "mobile" : "desktop"}.png`, scale: "css" });
  }
  await page.getByRole("button", { name: /retirer kedjenou de poulet des recettes sauvegardées|remove kedjenou de poulet from saved recipes/i }).click();
  await expect(page.getByText(/sauvegardez une recette|save a recipe/i)).toBeVisible();
  await expect.poll(() => savedState.recipeIds).toEqual([]);
  await expect(page.getByText(/synchronisé au compte|synced to account/i)).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("account settings synchronize language and protect session actions", async ({ page }) => {
  let preferredLanguage = "fr";
  let passwordRequest: { email?: string } | null = null;
  const customer = { id: "customer-settings", email: "awa@example.fr", phone: "+33612345678", firstName: "Awa", lastName: "Traore", role: "customer", loyaltyPoints: 180, walletCredit: 12.5, preferredLang: "fr" };
  const account = { customer, addresses: [] };

  await page.addInitScript(({ persistedCustomer }) => {
    localStorage.setItem("jma-store", JSON.stringify({
      state: { locale: "fr", cart: [], favorites: [], savedRecipes: [], savedOwnerId: persistedCustomer.id, recentlyViewed: [], customer: persistedCustomer, addresses: [], country: "France", postalCode: "75011", coupon: null },
      version: 0,
    }));
  }, { persistedCustomer: customer });

  await page.route("**/api/auth/customer/session", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(account) }));
  await page.route("**/api/orders?*", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ orders: [] }) }));
  await page.route("**/api/customer/account", async (route) => {
    const update = route.request().method() === "PATCH" ? route.request().postDataJSON() : {};
    if (update.preferredLang) preferredLanguage = update.preferredLang;
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ...account, customer: { ...customer, preferredLang: preferredLanguage } }) });
  });
  await page.route("**/api/auth/customer/password", async (route) => {
    passwordRequest = route.request().postDataJSON();
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true }) });
  });

  await page.goto("/?view=account&accountSection=settings", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Réglages du compte" })).toBeVisible();
  const accountNavigation = page.getByTestId("account-section-navigation");
  await expect(accountNavigation.getByRole("button", { name: "Réglages" })).toHaveAttribute("aria-current", "page");
  await expect(accountNavigation).toHaveCSS("position", "sticky");
  await expect(page.getByRole("heading", { name: "Mot de passe" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Fermer la session" })).toBeVisible();

  await page.getByRole("button", { name: "English", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Account settings" })).toBeVisible();
  await expect.poll(() => preferredLanguage).toBe("en");

  await page.getByRole("button", { name: "Send link" }).click();
  await expect(page.getByText("A secure link has just been sent to your email address.")).toBeVisible();
  await expect.poll(() => passwordRequest).toEqual({ email: customer.email });

  await page.locator("#main-content").getByRole("button", { name: "Sign out" }).click();
  const confirmation = page.getByRole("alertdialog");
  await expect(confirmation.getByRole("heading", { name: "Sign out?" })).toBeVisible();
  await expect(confirmation).toContainText("Your local cart stays available");
  await confirmation.getByRole("button", { name: "Stay signed in" }).click();
  await expect(page.getByRole("heading", { name: "Account settings" })).toBeVisible();

  await expectNoHorizontalOverflow(page);
  await expectBrandSafeUiColors(page);
  await expectNoSeriousA11yViolations(page);
  if (process.env.CLIENT_SCREENSHOTS) {
    await page.screenshot({ path: `output/playwright/audit/account-settings-${(page.viewportSize()?.width || 0) < 768 ? "mobile" : "desktop"}.png`, scale: "css" });
  }
});

test("the help center leads to a contextual and usable contact request", async ({ page }) => {
  const captured: { contactRequest: Record<string, string> | null } = { contactRequest: null };
  await page.route("**/api/contact", async (route) => {
    captured.contactRequest = route.request().postDataJSON();
    await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ reference: "JMA-CONTACT-260903" }) });
  });

  await page.goto("/?view=info&infoPage=help", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /comment pouvons-nous vous aider|how can we help/i })).toBeVisible();
  const informationNavigation = page.getByRole("navigation", { name: /information et assistance|information and support/i });
  await expect(informationNavigation).toBeVisible();
  await informationNavigation.getByRole("button", { name: /la maison|our company/i }).click();
  await expect(page.getByRole("heading", { name: /de la source à votre table|from source to table/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /produits|products/i }).last()).toBeVisible();
  await expect(page.getByRole("button", { name: /recettes|recipes/i }).last()).toBeVisible();
  await expectNoHorizontalOverflow(page);
  if (process.env.CLIENT_SCREENSHOTS) {
    await page.screenshot({ path: `output/playwright/audit/about-reference-${(page.viewportSize()?.width || 0) < 768 ? "mobile" : "desktop"}.png`, scale: "css" });
  }
  await informationNavigation.getByRole("button", { name: /^aide$|^help$/i }).click();
  await expect(page.getByRole("heading", { name: /comment pouvons-nous vous aider|how can we help/i })).toBeVisible();
  await expect(page.getByTestId("support-command-center")).toBeVisible();
  await expect(page.getByRole("searchbox", { name: /rechercher dans le centre d'aide|search the help centre/i })).toBeVisible();
  await page.getByRole("button", { name: /quels moyens de paiement|which payment methods/i }).click();
  await expect(page.getByText(/sécurisé par stripe|secured by stripe/i)).toBeVisible();
  await expect(page.locator("main")).not.toContainText(/paypal|carte cadeau|gift card/i);
  const helpSearch = page.getByRole("searchbox", { name: /rechercher dans le centre d'aide|search the help centre/i });
  await helpSearch.fill("remboursement");
  await expect(page.getByRole("button", { name: /produit manquant ou abîmé|missing or damaged product/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /quels moyens de paiement|which payment methods/i })).toBeHidden();
  await page.getByRole("button", { name: /effacer la recherche|clear search/i }).click();
  const deliveryTopic = page.getByTestId("support-topic-delivery");
  await deliveryTopic.click();
  await expect(deliveryTopic).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: /chaîne du froid|cold chain/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /commander sans compte|order without an account/i })).toBeHidden();
  await expectBrandSafeUiColors(page);
  if (process.env.CLIENT_SCREENSHOTS) {
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.screenshot({ path: `output/playwright/audit/help-reference-${(page.viewportSize()?.width || 0) < 768 ? "mobile" : "desktop"}.png`, scale: "css" });
  }

  await page.getByRole("button", { name: /ouvrir le formulaire|open the form/i }).click();
  await expect(page).toHaveURL(/view=info&infoPage=contact&contactReason=delivery/);
  await expect(page.getByRole("heading", { name: /parlez-nous de votre demande|tell us what you need/i })).toBeVisible();
  const contactReasonSelector = page.getByTestId("contact-reason-selector");
  await expect(contactReasonSelector.getByRole("button", { name: /livraison|delivery/i })).toHaveAttribute("aria-pressed", "true");
  await page.waitForTimeout(300); // Let the 200 ms workspace transition finish before simulating typing.
  const contactName = page.getByLabel(/nom complet|full name/i);
  const contactEmail = page.getByLabel(/e-mail/i);
  await contactName.pressSequentially("Awa Traoré");
  await expect(contactName).toHaveValue("Awa Traoré");
  await contactEmail.pressSequentially("awa@example.fr");
  await expect(contactEmail).toHaveValue("awa@example.fr");
  await expect(contactName).toHaveValue("Awa Traoré");
  await expect(contactEmail).toHaveValue("awa@example.fr");
  await page.getByLabel(/n° de commande|order number/i).fill("JMA-260903-0042");
  await expect(contactName).toHaveValue("Awa Traoré");
  await expect(contactEmail).toHaveValue("awa@example.fr");
  await page.getByLabel(/objet|subject/i).fill("Température du colis");
  await expect(contactName).toHaveValue("Awa Traoré");
  await expect(contactEmail).toHaveValue("awa@example.fr");
  await page.getByLabel(/^message$/i).fill("Je souhaite vérifier les conditions de transport de mon colis surgelé.");
  await expect(contactName).toHaveValue("Awa Traoré");
  await expect(contactEmail).toHaveValue("awa@example.fr");
  await expect(page.getByRole("progressbar", { name: /préparation de la demande|request readiness/i })).toHaveAttribute("aria-valuenow", "100");
  const submitContact = page.getByRole("button", { name: /envoyer la demande|send request/i });
  await submitContact.focus();
  await submitContact.press("Enter");

  const successMessage = page.getByText(/JMA-CONTACT-260903/);
  await expect(successMessage).toBeVisible();
  await expect(page.getByRole("progressbar", { name: /préparation de la demande|request readiness/i })).toHaveAttribute("aria-valuenow", "100");
  await expect(page.getByRole("button", { name: /nouvelle demande|new request/i })).toBeVisible();
  expect(captured.contactRequest).not.toBeNull();
  expect(captured.contactRequest?.subject).toContain("[Livraison]");
  expect(captured.contactRequest?.subject).toContain("JMA-260903-0042");
  expect(captured.contactRequest?.message).toContain("Commande: JMA-260903-0042");
  await expectNoHorizontalOverflow(page);
  if (process.env.CLIENT_SCREENSHOTS) {
    await successMessage.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `output/playwright/audit/contact-reference-${(page.viewportSize()?.width || 0) < 768 ? "mobile" : "desktop"}.png`, scale: "css" });
  }
  await page.getByRole("button", { name: /passer la plateforme en anglais|switch the platform to french/i }).click();
  await expect(page.getByRole("heading", { name: "Tell us what you need" })).toBeVisible();
  await expect(page.getByText(/Request JMA-CONTACT-260903 recorded/)).toBeVisible();
  await expect(page.getByRole("button", { name: "New request" })).toBeVisible();
  await expect(contactReasonSelector.getByRole("button", { name: /delivery/i })).toHaveAttribute("aria-pressed", "true");
  await expectNoSeriousA11yViolations(page);
});

test("checkout compares delivery services and protects the cold chain", async ({ page }) => {
  const customer = { id: "customer-checkout", email: "awa@example.fr", phone: "+33612345678", firstName: "Awa", lastName: "Traoré", role: "customer", loyaltyPoints: 180, walletCredit: 0 };
  const quoteRequests: Array<Record<string, unknown>> = [];
  await page.addInitScript(({ persistedCustomer }) => {
    localStorage.setItem("jma-store", JSON.stringify({
      state: {
        locale: "fr",
        cart: [{ id: "line-frozen", productId: "product-frozen", name: "Gombo surgelé", nameFr: "Gombo surgelé", nameEn: "Frozen okra", unitPrice: 8.5, unitLabel: "500 g", packWeightGrams: 500, thermalClass: "FROZEN", imageUrl: "/products/gombo.webp", qty: 2, maxStock: 40 }],
        customer: persistedCustomer,
        addresses: [
          { id: "address-checkout", label: "Domicile", firstName: "Awa", lastName: "Traoré", street: "12 rue de la Gare", postalCode: "75011", city: "Paris", country: "France", phone: "+33612345678", isDefault: true },
          { id: "address-office", label: "Bureau", firstName: "Awa", lastName: "Traoré", street: "8 Alexanderplatz", postalCode: "10178", city: "Berlin", country: "Allemagne", phone: "+49301234567" },
        ],
        favorites: [], savedRecipes: [], recentlyViewed: [], country: "Belgique", postalCode: "1000", coupon: null,
      },
      version: 0,
    }));
  }, { persistedCustomer: customer });
  await page.route("**/api/auth/customer/session", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ customer }) }));
  await page.route("**/api/shipping/quote", async (route) => {
    quoteRequests.push(route.request().postDataJSON());
    const options = [
      { service: "standard", fee: 8.5, carrier: "Chrono Frais", packages: 1, minDelayHours: 24, maxDelayHours: 48, available: true, unavailableReason: null },
      { service: "express", fee: 12.9, carrier: "Flotte interne JMA", packages: 1, minDelayHours: 12, maxDelayHours: 24, available: true, unavailableReason: null },
      { service: "relay", fee: 0, carrier: "DPD Relais", packages: 1, minDelayHours: 48, maxDelayHours: 72, available: false, unavailableReason: "cold_chain" },
    ];
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ...options[0], options }) });
  });

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /^(panier|cart)$|^(finaliser le panier|complete basket)\b/i }).first().click();
  const isMobile = (page.viewportSize()?.width || 0) < 768;
  await expect.poll(() => quoteRequests[0]?.country).toBe("Belgique");
  expect(quoteRequests[0]?.postalCode).toBe("1000");
  await expect(page.getByText("1000 · Belgique", { exact: true })).toBeVisible();
  await expectLoadedProductImages(page.getByRole("img", { name: /gombo surgelé|frozen okra/i }), 1);
  const cartDock = page.getByTestId("cart-checkout-dock");
  if (isMobile) {
    await expect(cartDock).toBeVisible();
    await expect(cartDock).toContainText(/25,50\s*€/);
    const cartDockBox = await cartDock.boundingBox();
    const navigationBox = await page.getByTestId("mobile-navigation").boundingBox();
    expect(Math.abs((cartDockBox?.y || 0) + (cartDockBox?.height || 0) - (navigationBox?.y || 0))).toBeLessThanOrEqual(2);
  } else {
    await expect(cartDock).toBeHidden();
  }
  if (process.env.CLIENT_SCREENSHOTS) {
    await page.screenshot({ path: `output/playwright/audit/cart-filled-${(page.viewportSize()?.width || 0) < 768 ? "mobile" : "desktop"}.png`, scale: "css" });
  }
  if ((page.viewportSize()?.width || 0) >= 768) {
    const sidebar = page.locator("aside").first();
    const orderNavigationBox = await sidebar.getByRole("button", { name: /suivre mes commandes|track my orders/i }).boundingBox();
    const profileBox = await sidebar.getByRole("button", { name: /awa traoré/i }).boundingBox();
    expect((orderNavigationBox?.y || 0) + (orderNavigationBox?.height || 0)).toBeLessThanOrEqual(profileBox?.y || 0);
  }
  await expectNoHorizontalOverflow(page);
  await page.getByRole("button", { name: /passer la commande|place order/i }).click();

  await expect(page.getByRole("heading", { name: /paiement|checkout/i })).toBeVisible();
  const checkoutDock = page.getByTestId("checkout-action-dock");
  if (isMobile) {
    await expect(checkoutDock).toBeVisible();
    await expect(checkoutDock).toContainText(/25,50\s*€/);
    const checkoutDockBox = await checkoutDock.boundingBox();
    const navigationBox = await page.getByTestId("mobile-navigation").boundingBox();
    expect(Math.abs((checkoutDockBox?.y || 0) + (checkoutDockBox?.height || 0) - (navigationBox?.y || 0))).toBeLessThanOrEqual(2);
    const orderSummary = page.locator("details").filter({ hasText: /votre commande|your order/i });
    await expect(orderSummary).toBeVisible();
    await orderSummary.locator("summary").click();
    await expectLoadedProductImages(orderSummary.getByRole("img", { name: /gombo surgelé|frozen okra/i }), 1);
    await orderSummary.locator("summary").click();
  } else {
    const orderSummary = page.getByRole("complementary", { name: /résumé de la commande|order summary/i });
    await expect(orderSummary).toBeVisible();
    await expectLoadedProductImages(orderSummary.getByRole("img", { name: /gombo surgelé|frozen okra/i }), 1);
  }
  await expect(page.getByLabel(/pays de livraison|delivery country/i)).toHaveValue("France");
  await expect(page.getByRole("heading", { name: /coordonnées de contact|contact details/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /adresse de livraison|delivery address/i })).toBeVisible();
  const savedAddress = page.getByLabel(/utiliser une adresse enregistrée|use a saved address/i);
  await expect(savedAddress).toHaveValue("address-checkout");
  await savedAddress.selectOption("address-office");
  await expect(page.getByLabel(/^adresse$|^street address$/i)).toHaveValue("8 Alexanderplatz");
  await expect(page.getByLabel(/pays de livraison|delivery country/i)).toHaveValue("Allemagne");
  await expect.poll(() => quoteRequests.at(-1)?.country).toBe("Allemagne");
  const standard = page.getByRole("radio", { name: /standard/i });
  const express = page.getByRole("radio", { name: /express/i });
  const relay = page.getByRole("radio", { name: /relais|collection point/i });
  await expect(standard).toBeChecked();
  await expect(relay).toBeDisabled();
  await expect(page.getByText(/indisponible avec les produits frais ou surgelés|unavailable for chilled or frozen products/i)).toBeVisible();
  const deliveryPromise = page.getByTestId("delivery-promise");
  await expect(deliveryPromise).toContainText(/arrivée estimée|estimated arrival/i);
  await expect(deliveryPromise).toContainText("Chrono Frais");
  await expect(deliveryPromise).toContainText(/1 colis|1 parcel/i);
  await expect(deliveryPromise).toContainText(/froid suivi|cold chain/i);
  const deliveryOptions = page.getByRole("radiogroup", { name: /mode de livraison|delivery option/i });
  const optionColumns = await deliveryOptions.evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(" ").length);
  expect(optionColumns).toBe(isMobile ? 1 : 3);
  if (process.env.CLIENT_SCREENSHOTS) {
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.screenshot({ path: `output/playwright/audit/checkout-overview-${isMobile ? "mobile" : "desktop"}.png`, scale: "css" });
  }
  await express.check();
  await expect(express).toBeChecked();
  await expect(deliveryPromise).toContainText("Flotte interne JMA");
  await expect(deliveryOptions).toContainText(/12 à 24 h|12-24 h/i);
  if (isMobile) await expect(checkoutDock).toContainText(/29,90\s*€/);

  await page.getByLabel(/pays de livraison|delivery country/i).selectOption("Belgique");
  await expect.poll(() => quoteRequests.at(-1)?.country).toBe("Belgique");
  await expect(page.locator("body")).not.toContainText(/doit être configuré avant l'ouverture|must be configured before orders/i);
  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    await expect(page.getByText(/paiement momentanément indisponible|payment temporarily unavailable/i)).toBeVisible();
    await expect(page.getByText(/votre panier reste enregistré|your basket remains saved/i)).toBeVisible();
  }
  if (process.env.CLIENT_SCREENSHOTS) {
    await page.getByText(/mode de livraison|delivery option/i).scrollIntoViewIfNeeded();
    await page.screenshot({ path: `output/playwright/audit/checkout-delivery-${(page.viewportSize()?.width || 0) < 768 ? "mobile" : "desktop"}.png`, scale: "css" });
  }
  await expectNoHorizontalOverflow(page);
  await expectNoSeriousA11yViolations(page);
});

test("the confirmation receipt survives a direct link and leads into delivery tracking", async ({ page }) => {
  const customer = { id: "customer-confirmed", email: "awa@example.fr", phone: "+33612345678", firstName: "Awa", lastName: "Traoré", role: "customer", loyaltyPoints: 180, walletCredit: 0 };
  const confirmedOrder = {
    id: "order-confirmed",
    number: "JMA-260904-0218",
    status: "paymentConfirmed",
    subtotal: 35.8,
    shippingCost: 8.5,
    vatAmount: 7.38,
    promoDiscount: 2,
    total: 42.3,
    currency: "EUR",
    weightGrams: 1900,
    packageCount: 2,
    createdAt: "2026-09-04T10:12:00.000Z",
    deliveryName: "Awa Traoré",
    deliveryAddress: "12 rue des Cultures",
    deliveryCity: "Paris",
    deliveryPostalCode: "75011",
    deliveryCountry: "France",
    deliverySlot: "standard",
    paymentMethod: "card",
    items: [
      { id: "confirmed-line-1", productId: "product-attieke", name: "Attiéké frais", nameFr: "Attiéké frais", nameEn: "Fresh attieke", sku: "JMA-ATT-500", unitPrice: 4.9, qty: 2, lineTotal: 9.8, thermalClass: "REFRIGERATED", recipeId: null, recipeName: null, packWeightGrams: 500, unitLabel: "500 g", imageUrl: "/products/attieke.webp" },
      { id: "confirmed-line-2", productId: "product-gombo", name: "Gombo surgelé", nameFr: "Gombo surgelé", nameEn: "Frozen okra", sku: "JMA-GOM-500", unitPrice: 8.5, qty: 2, lineTotal: 17, thermalClass: "FROZEN", recipeId: null, recipeName: null, packWeightGrams: 500, unitLabel: "500 g", imageUrl: "/products/gombo.webp" },
    ],
    shipments: [{ id: "confirmed-shipment", carrierId: null, carrier: "Chrono Frais", carrierName: "Chrono Frais", trackingNumber: null, thermalClass: "FROZEN", status: "preparing", confirmCode: null, estimatedDelivery: "2026-09-06T14:00:00.000Z", actualDelivery: null }],
    timeline: [{ id: "confirmed-event", status: "paymentConfirmed", label: "Paiement confirmé", at: "2026-09-04T10:12:00.000Z", actor: null }],
    payments: [{ id: "confirmed-payment", amount: 42.3, method: "card", status: "captured", reference: "pi_jma_confirmed" }],
  };

  await page.addInitScript(({ persistedCustomer }) => {
    localStorage.setItem("jma-store", JSON.stringify({
      state: {
        locale: "fr",
        cart: [],
        customer: persistedCustomer,
        addresses: [],
        favorites: [],
        savedRecipes: [],
        recentlyViewed: [],
        country: "France",
        postalCode: "75011",
        coupon: null,
      },
      version: 0,
    }));
  }, { persistedCustomer: customer });
  await page.route("**/api/auth/customer/session", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ customer }) }));
  await page.route("**/api/orders/order-confirmed*", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(confirmedOrder) }));

  await page.goto("/?view=order-confirmation&orderId=order-confirmed", { waitUntil: "domcontentloaded" });
  const isMobile = (page.viewportSize()?.width || 0) < 768;
  await expect(page).toHaveURL(/view=order-confirmation&orderId=order-confirmed/);
  await expect(page.getByRole("heading", { name: /merci awa, c'est confirmé|thank you awa, it is confirmed/i })).toBeVisible();
  await expect(page.getByTestId("confirmation-command-center")).toContainText("JMA-260904-0218");
  await expect(page.getByRole("list", { name: /prochaines étapes de la commande|next order steps/i })).toContainText(/paiement validé|payment validated/i);
  await expect(page.getByRole("heading", { name: /articles confirmés|confirmed items/i })).toBeVisible();
  await expectLoadedProductImages(page.getByRole("main").getByRole("img"), 2);
  await expect(page.getByRole("heading", { name: /6 sept\. 2026|6 september 2026/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /paiement validé|payment validated/i })).toBeVisible();
  await expect(page.getByText("42,30 €", { exact: true })).toBeVisible();

  const actions = isMobile ? page.getByTestId("confirmation-action-dock") : page.getByTestId("confirmation-desktop-actions");
  if (isMobile) {
    await expect(actions).toBeVisible();
    const dockBox = await actions.boundingBox();
    const navigationBox = await page.getByTestId("mobile-navigation").boundingBox();
    expect(Math.abs((dockBox?.y || 0) + (dockBox?.height || 0) - (navigationBox?.y || 0))).toBeLessThanOrEqual(2);
  } else {
    await expect(page.getByTestId("confirmation-action-dock")).toBeHidden();
  }

  const downloadPromise = page.waitForEvent("download");
  await actions.getByRole("button", { name: /télécharger la facture|download invoice|facture|invoice/i }).click();
  await expect((await downloadPromise).suggestedFilename()).toBe("JMA-260904-0218.html");
  await expectNoHorizontalOverflow(page);
  await expectBrandSafeUiColors(page);
  await expectNoSeriousA11yViolations(page);
  if (process.env.CLIENT_SCREENSHOTS) {
    await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: "auto" }));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: `output/playwright/audit/order-confirmation-${isMobile ? "mobile" : "desktop"}.png`, scale: "css" });
  }

  await actions.getByRole("button", { name: /suivre|track/i }).click();
  await expect(page).toHaveURL(/view=order-tracking&orderId=order-confirmed/);
  await expect(page.getByRole("heading", { name: "JMA-260904-0218" })).toBeVisible();
});

test("the recipe configurator recalculates, removes and restores an ingredient", async ({ page }) => {
  await page.goto("/?view=recipes", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /moteur de recettes africaines|african recipe engine/i })).toBeVisible();
  await page.getByRole("button", { name: /configurer|configure/i }).first().click();

  await expect(page.getByRole("heading", { name: /configurateur de recette|recipe configurator/i })).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\?view=recipe-config&recipeId=[^&]+/);
  const recipeSchema = JSON.parse((await page.locator('script[id^="jma-structured-recipe-"]').textContent()) || "{}");
  expect(recipeSchema["@type"]).toBe("Recipe");
  expect(recipeSchema.recipeIngredient.length).toBeGreaterThan(0);
  expect(recipeSchema.recipeInstructions.length).toBeGreaterThan(0);
  const isMobile = (page.viewportSize()?.width || 0) < 768;
  const configuratorHeaderBox = await page.getByTestId("recipe-header").boundingBox();
  if (isMobile) expect(configuratorHeaderBox?.height || Number.POSITIVE_INFINITY).toBeLessThanOrEqual(210);
  await expect(page.getByTestId("recipe-flow-nav")).toContainText(/configurer|configure/i);
  await expect(page.getByTestId("recipe-flow-nav")).toContainText(/ingrédients|ingredients/i);
  await expect(page.getByTestId("recipe-flow-nav")).toContainText(/préparation|preparation/i);
  await expect(page.getByTestId("recipe-flow-nav")).toContainText(/\d+\/\d+ (terminées|complete)/i);
  const recipeFlow = page.getByTestId("recipe-flow-nav");
  const settingsStage = recipeFlow.getByRole("button", { name: /configurer|configure/i });
  const ingredientsStage = recipeFlow.getByRole("button", { name: /ingrédients|ingredients/i });
  const preparationStage = recipeFlow.getByRole("button", { name: /préparation|preparation/i });
  await expect(settingsStage).toHaveAttribute("aria-pressed", "true");
  if (isMobile) {
    const recipeDock = page.getByTestId("recipe-live-summary");
    await expect(recipeDock).toBeVisible();
    await expect(recipeDock).toContainText(/au total|total/i);
    const recipeDockBox = await recipeDock.boundingBox();
    const navigationBox = await page.getByTestId("mobile-navigation").boundingBox();
    expect(Math.abs((recipeDockBox?.y || 0) + (recipeDockBox?.height || 0) - (navigationBox?.y || 0))).toBeLessThanOrEqual(2);
    await expect(page.getByText(/ingrédients nécessaires|ingredients needed/i)).toBeHidden();
    if (process.env.CLIENT_SCREENSHOTS) {
      await page.screenshot({ path: "output/playwright/audit/configurator-settings-mobile.png", scale: "css" });
    }
    await recipeDock.getByRole("button", { name: /voir les ingrédients|view ingredients/i }).click();
    await expect(ingredientsStage).toHaveAttribute("aria-pressed", "true");
  } else {
    await expect(page.getByTestId("recipe-live-summary")).toBeHidden();
  }
  await expect(page.getByText(/ingrédients nécessaires|ingredients needed/i)).toBeVisible();
  if (!isMobile) await expect(page.getByText(/coût total|total cost/i)).toBeVisible();
  if (isMobile) {
    await expect(page.getByRole("button", { name: /j'ai déjà .* à la maison|i already have .* at home/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /retirer de la recette|remove from recipe/i }).first()).toBeVisible();
    if (process.env.CLIENT_SCREENSHOTS) {
      await page.screenshot({ path: "output/playwright/audit/configurator-ingredients-mobile.png", scale: "css" });
    }
  }

  const remove = page.getByRole("button", { name: /retirer de la recette|remove from recipe/i }).first();
  await remove.click();
  await expect(page.getByText(/retiré de cette recette|removed from this recipe/i).first()).toBeVisible();
  await page.getByRole("button", { name: /réintégrer l'ingrédient|restore ingredient/i }).first().click();
  await expect(page.getByText(/retiré de cette recette|removed from this recipe/i)).toHaveCount(0);

  await page.locator("#recipe-ingredients details summary").first().click();
  const replacement = page.getByLabel(/remplacer |replace /i).first();
  expect(await replacement.locator("option").count()).toBeGreaterThan(1);
  await replacement.selectOption({ index: 1 });
  await expect(page.getByText(/remplace |replaces /i).first()).toBeVisible();
  if (isMobile) {
    await page.getByTestId("recipe-live-summary").getByRole("button", { name: /préparation|preparation/i }).click();
    await expect(preparationStage).toHaveAttribute("aria-pressed", "true");
  }
  const preparationList = page.locator("#recipe-preparation ol");
  await expect(preparationList).toContainText(/Égousi|Egusi/i);
  await expect(preparationList).not.toContainText(/Pâte d'arachide|Peanut paste/i);
  await expect(page.locator("#recipe-preparation")).toContainText(/adaptée|adapted/i);

  const cookingFocus = page.getByTestId("recipe-cooking-focus");
  await expect(cookingFocus).toContainText(/à faire maintenant|do this now/i);
  await expect(cookingFocus).toContainText(/progression\s*0 %|progress\s*0 %/i);
  const preparationProgress = page.locator("#recipe-preparation").getByRole("progressbar");
  await expect(preparationProgress).toHaveAttribute("aria-valuenow", "0");
  await cookingFocus.getByRole("button", { name: /terminer et continuer|complete and continue/i }).click();
  await expect(preparationProgress).toHaveAttribute("aria-valuenow", "1");
  await expect(cookingFocus).toContainText(/étape 2|step 2/i);
  await cookingFocus.getByRole("button", { name: /revenir d'une étape|go back one step/i }).click();
  await expect(preparationProgress).toHaveAttribute("aria-valuenow", "0");

  const firstStep = page.locator("#recipe-preparation ol button").first();
  await expect(firstStep).toBeVisible();
  await firstStep.click();
  await expect(firstStep).toHaveAttribute("aria-pressed", "true");
  await expect(cookingFocus).toContainText(/étape 2|step 2/i);
  await expectBrandSafeUiColors(page);
  if (process.env.CLIENT_SCREENSHOTS) {
    await cookingFocus.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `output/playwright/audit/configurator-cooking-${isMobile ? "mobile" : "desktop"}.png`, scale: "css" });
  }
  await expectNoHorizontalOverflow(page);
  await expectNoSeriousA11yViolations(page);

  const configuredIngredientCount = await page.locator("#recipe-ingredients img").count();
  const addConfiguredBasket = isMobile
    ? page.getByTestId("recipe-live-summary").getByRole("button", { name: /ajouter tout au panier|add all to cart/i })
    : page.getByRole("button", { name: /ajouter tout au panier|add all to cart/i }).first();
  await addConfiguredBasket.click();
  await expect(page.getByRole("heading", { name: /panier|basket|cart/i }).first()).toBeVisible();
  await expect(page.getByRole("main").getByRole("img")).toHaveCount(configuredIngredientCount);
});

test("delivered orders expose carrier tracking and proof without leaking internal notes", async ({ page }) => {
  const deliveredOrder = {
    id: "order-delivered",
    number: "JMA-260902-0098",
    status: "delivered",
    subtotal: 39,
    shippingCost: 6.9,
    vatAmount: 7.65,
    promoDiscount: 0,
    total: 45.9,
    weightGrams: 2200,
    packageCount: 1,
    createdAt: "2026-09-01T09:30:00.000Z",
    deliveryName: "Aminata Koné",
    deliveryAddress: "12 rue des Cultures",
    deliveryCity: "Paris",
    deliveryPostalCode: "75011",
    deliveryCountry: "France",
    deliverySlot: "standard",
    paymentMethod: "card",
    items: [
      { id: "line-proof", productId: "product-1", name: "Attiéké frais", nameFr: "Attiéké frais", nameEn: "Fresh attieke", sku: "JMA-ATT-500", unitPrice: 7, currentUnitPrice: 7.5, qty: 5, lineTotal: 35, thermalClass: "REFRIGERATED", imageUrl: "/products/attieke.webp", recipeId: null, recipeName: null, unitLabel: "Sachet 500 g", packWeightGrams: 500, maxStock: 3, purchasable: true },
      { id: "line-sold-out", productId: "product-2", name: "Piment frais", nameFr: "Piment frais", nameEn: "Fresh chilli", sku: "JMA-PIM-200", unitPrice: 4, qty: 1, lineTotal: 4, thermalClass: "REFRIGERATED", imageUrl: "/products/piment-frais.webp", recipeId: null, recipeName: null, unitLabel: "Barquette 200 g", packWeightGrams: 200, maxStock: 0, purchasable: false },
    ],
    shipments: [{ id: "shipment-proof", trackingNumber: "JMA-FR-260902-PROOF", thermalClass: "REFRIGERATED", status: "delivered", estimatedDelivery: "2026-09-02T14:00:00.000Z", actualDelivery: "2026-09-02T15:12:00.000Z", confirmCode: "4821", carrier: "Chrono Frais Europe", carrierName: "Chrono Frais Europe", trackingUrl: "https://track.example.com/{ref}", proofPhoto: "/hero-feast-v2.webp", signature: "Aminata Koné" }],
    timeline: [{ status: "paymentConfirmed", label: "Payment confirmed", at: "2026-09-01T09:30:00.000Z", actor: null }, { status: "delivered", label: "Delivered", at: "2026-09-02T15:12:00.000Z", actor: null }],
    payments: [{ method: "Carte", status: "captured", amount: 45.9, reference: "pi_proof" }],
  };
  const activeOrder = {
    ...deliveredOrder,
    id: "order-active",
    number: "JMA-260903-0114",
    status: "in_transit",
    subtotal: 25.5,
    shippingCost: 6.9,
    vatAmount: 5.4,
    total: 32.4,
    weightGrams: 1500,
    createdAt: "2026-09-03T08:10:00.000Z",
    deliveryCity: "Bruxelles",
    deliveryPostalCode: "1000",
    deliveryCountry: "Belgique",
    items: [{ id: "line-active", productId: "product-active", name: "Gombo surgelé", nameFr: "Gombo surgelé", nameEn: "Frozen okra", sku: "JMA-GOM-500", unitPrice: 8.5, currentUnitPrice: 8.5, qty: 3, lineTotal: 25.5, thermalClass: "FROZEN", imageUrl: "/products/gombo.webp", recipeId: null, recipeName: null, unitLabel: "Sachet 500 g", packWeightGrams: 500, maxStock: 18, purchasable: true }],
    shipments: [{ id: "shipment-active", trackingNumber: "JMA-BE-260903-ACTIVE", thermalClass: "FROZEN", status: "in_transit", estimatedDelivery: "2026-09-05T12:00:00.000Z", actualDelivery: null, confirmCode: "5930", carrier: "Chrono Frais Europe", carrierName: "Chrono Frais Europe", trackingUrl: "https://track.example.com/{ref}", proofPhoto: null, signature: null }],
    timeline: [{ status: "paymentConfirmed", label: "Payment confirmed", at: "2026-09-03T08:10:00.000Z", actor: null }, { status: "in_transit", label: "In transit", at: "2026-09-03T14:20:00.000Z", actor: null }],
    payments: [{ method: "Carte", status: "captured", amount: 32.4, reference: "pi_active" }],
  };

  await page.route("**/api/auth/customer/session", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ customer: { id: "customer-proof", email: "aminata@example.fr", phone: "+33600000000", firstName: "Aminata", lastName: "Koné", role: "customer", loyaltyPoints: 200, walletCredit: 0 } }) }));
  await page.route("**/api/orders?*", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ orders: [deliveredOrder, activeOrder] }) }));
  await page.route("**/api/orders/order-delivered?*", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(deliveredOrder) }));

  await page.goto("/?view=orders", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /mes commandes|my orders/i })).toBeVisible();
  const portfolio = page.getByTestId("orders-portfolio");
  await expect(portfolio).toContainText(/en cours|active/i);
  await expect(portfolio).toContainText(/livrées|delivered/i);
  await expect(portfolio).toContainText(/78,30 €|€78\.30/);
  await expect(page.getByTestId("order-focus")).toContainText("JMA-260903-0114");
  await expect(page.getByTestId("order-progress-order-active").getByRole("progressbar")).toHaveAttribute("aria-valuenow", "76");
  await expect(page.getByLabel(/n° de commande ou produit|order number or product/i)).toBeVisible();
  await page.getByLabel(/n° de commande ou produit|order number or product/i).fill("attiéké");
  await expect(page.getByText("JMA-260902-0098")).toBeVisible();
  await page.getByLabel(/n° de commande ou produit|order number or product/i).fill("introuvable");
  await expect(page.getByText(/aucune commande ne correspond|no order matches/i)).toBeVisible();
  await page.getByRole("button", { name: /réinitialiser|reset/i }).click();
  const deliveredFilter = page.getByRole("button", { name: /livrées|delivered/i });
  await deliveredFilter.click();
  await expect(deliveredFilter).toHaveAttribute("aria-pressed", "true");
  await expect(deliveredFilter).toHaveCSS("background-color", "rgb(138, 48, 66)");
  await expect(page.getByTestId("order-progress-order-delivered").getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
  await expectLoadedProductImages(page.getByRole("img", { name: /attiéké frais|fresh attieke|piment frais|fresh chilli/i }), 2);
  if (process.env.CLIENT_SCREENSHOTS) {
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.screenshot({ path: `output/playwright/audit/orders-center-${(page.viewportSize()?.width || 0) < 768 ? "mobile" : "desktop"}.png`, scale: "css" });
  }
  await expectNoHorizontalOverflow(page);
  await expectBrandSafeUiColors(page);
  await expectNoSeriousA11yViolations(page);
  await page.getByRole("button", { name: /recommander|reorder/i }).click();
  await expect(page.getByRole("alertdialog")).toContainText(/partiellement disponible|partially available/i);
  await page.getByRole("button", { name: /continuer|continue/i }).click();
  await expect(page.getByText(/attiéké frais|fresh attieke/i).first()).toBeVisible();
  await expect(page.getByText(/22,50 €|€22\.50/).first()).toBeVisible();
  await expect(page.locator("main")).not.toContainText(/piment frais|fresh chilli/i);

  await page.goto("/?view=orders", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /^(suivre|track)$/i }).first().click();
  const isMobile = (page.viewportSize()?.width || 0) < 768;
  await expect(page.getByRole("heading", { name: "JMA-260902-0098" })).toBeVisible();
  await expect(page.getByRole("button", { name: /facture|invoice/i })).toBeVisible();
  const deliveryCommandCenter = page.getByTestId("delivery-command-center");
  await expect(deliveryCommandCenter).toContainText(/commande a été remise|order has been delivered/i);
  await expect(deliveryCommandCenter).toContainText(/chrono frais europe/i);
  await expect(deliveryCommandCenter).toContainText(/colis\s*1|parcels\s*1/i);
  await expect(page.getByRole("progressbar", { name: /livraison terminée|delivery .*complete/i })).toHaveAttribute("aria-valuenow", "100");
  await expect(page.getByRole("link", { name: /suivre chez le transporteur|track with carrier/i })).toHaveAttribute("href", "https://track.example.com/JMA-FR-260902-PROOF");
  const deliveryProofHeading = page.getByText(/^(preuve de remise|delivery proof)$/i);
  await expect(deliveryProofHeading).toBeVisible();
  await expect(page.getByRole("img", { name: /preuve de livraison|delivery proof/i })).toBeVisible();
  await expect(page.getByText(/reçu par aminata koné|received by aminata koné/i)).toBeVisible();
  const trackingDock = page.getByTestId("order-tracking-action-dock");
  const trackingTabs = page.getByTestId("tracking-mobile-tabs");
  const addressHeading = page.getByRole("heading", { name: /adresse|address/i });
  const orderItemsHeading = page.getByRole("heading", { name: /articles|items/i });
  if (isMobile) {
    await expect(trackingDock).toBeVisible();
    await expect(trackingDock).toContainText(/45,90\s*€|€45\.90/);
    await expect(trackingDock.getByRole("link", { name: /suivre le colis|track parcel/i })).toHaveAttribute("href", "https://track.example.com/JMA-FR-260902-PROOF");
    const trackingDockBox = await trackingDock.boundingBox();
    const navigationBox = await page.getByTestId("mobile-navigation").boundingBox();
    expect(Math.abs((trackingDockBox?.y || 0) + (trackingDockBox?.height || 0) - (navigationBox?.y || 0))).toBeLessThanOrEqual(2);
    await expect(trackingTabs).toBeVisible();
    await expect(trackingTabs.getByRole("button", { name: /livraison|delivery/i })).toHaveAttribute("aria-pressed", "true");
    await expect(addressHeading).toBeHidden();
    await expect(orderItemsHeading).toBeHidden();
    await trackingTabs.getByRole("button", { name: /ma commande|my order/i }).click();
    await expect(trackingTabs.getByRole("button", { name: /ma commande|my order/i })).toHaveAttribute("aria-pressed", "true");
    await expect(addressHeading).toBeVisible();
    await expect(orderItemsHeading).toBeVisible();
    await expect(page.getByText(/livraison standard|standard delivery/i).first()).toBeVisible();
    await expect(deliveryProofHeading).toBeHidden();
    await trackingTabs.getByRole("button", { name: /livraison|delivery/i }).click();
  } else {
    await expect(trackingDock).toBeHidden();
    await expect(trackingTabs).toBeHidden();
    await expect(addressHeading).toBeVisible();
    await expect(orderItemsHeading).toBeVisible();
    await expect(page.getByText(/livraison standard|standard delivery/i).first()).toBeVisible();
  }
  await expect(page.locator("body")).not.toContainText(/notes internes|internal operations notes|chaîne du froid contrôlée/i);
  await expectNoHorizontalOverflow(page);
  await expectNoSeriousA11yViolations(page);
  if (process.env.CLIENT_SCREENSHOTS) {
    await page.screenshot({ path: `output/playwright/audit/order-tracking-${(page.viewportSize()?.width || 0) < 768 ? "mobile" : "desktop"}.png`, fullPage: true, scale: "css" });
  }

  await page.goto("/?view=order-tracking&orderId=order-delivered", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "JMA-260902-0098" })).toBeVisible();
});
