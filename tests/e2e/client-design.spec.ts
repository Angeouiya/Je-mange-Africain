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

test("the client application exposes clear catalogue, recipe and basket workspaces", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.locator("body")).not.toContainText(/dashboard admin|administration/i);

  await page.getByRole("button", { name: /catégories|categories|acheter les produits|shop products/i }).first().click();
  await expect(page.getByRole("heading", { name: /marché je mange africain|je mange africain market/i })).toBeVisible();
  await expect(page.getByLabel(/rechercher dans le catalogue|search the catalogue/i)).toBeVisible();
  await expect(page.getByLabel(/trier les produits|sort products/i)).toBeVisible();
  await expect(page.locator("main img").first()).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expectNoSeriousA11yViolations(page);

  await page.getByRole("button", { name: /recettes|cuisiner une recette|cook a recipe/i }).first().click();
  await expect(page.getByRole("heading", { name: /moteur de recettes africaines|african recipe engine/i })).toBeVisible();
  await expect(page.getByRole("tab", { name: /bibliothèque|dish library/i })).toBeVisible();
  await expect(page.getByLabel(/rechercher une recette ou un plat|search for a recipe or dish/i)).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.getByRole("button", { name: /^(panier|cart)$|^(finaliser le panier|complete basket)\b/i }).first().click();
  await expect(page.getByText(/votre panier est vide|your cart is empty/i)).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("product details stay bounded and preserve real visual identification in the basket", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /catégories|categories|acheter les produits|shop products/i }).first().click();
  await expect(page.getByRole("heading", { name: /marché je mange africain|je mange africain market/i })).toBeVisible();

  const firstProduct = page.locator("main h3").first();
  const productName = (await firstProduct.textContent())?.trim() || "";
  expect(productName).not.toBe("");
  await firstProduct.click();

  await expect(page.getByRole("heading", { level: 1, name: productName })).toBeVisible();
  await expect(page.getByRole("button", { name: /retour|back/i })).toHaveCount(1);
  await expect(page.locator("main img").first()).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.getByRole("button", { name: /ajouter au panier|add to cart/i }).first().click();
  await page.getByRole("button", { name: /^(panier|cart)$|^(finaliser le panier|complete basket)\b/i }).first().click();
  await expect(page.getByRole("heading", { name: /mon panier|my cart/i })).toBeVisible();
  await expect(page.getByText(productName, { exact: true })).toBeVisible();
  await expect(page.getByRole("img", { name: productName })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("registration requires legal consent and two independently visible passwords", async ({ page }) => {
  await page.goto("/?view=account", { waitUntil: "domcontentloaded" });
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await page.getByRole("tab", { name: /inscription|register/i }).click();

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

  await page.getByRole("checkbox", { name: /conditions générales|terms of use/i }).click();
  await expect(page.getByRole("button", { name: /créer mon compte|create my account/i })).toBeDisabled();
  await page.getByRole("checkbox", { name: /politique de confidentialité|privacy policy/i }).click();
  await expect(page.getByRole("button", { name: /créer mon compte|create my account/i })).toBeEnabled();
  await expectNoHorizontalOverflow(page, dialog);
  await expectNoSeriousA11yViolations(page);

  await page.getByRole("button", { name: /fermer la connexion|close sign-in/i }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByRole("main")).toBeVisible();
});

test("the recipe configurator recalculates, removes and restores an ingredient", async ({ page }) => {
  await page.goto("/?view=recipes", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /moteur de recettes africaines|african recipe engine/i })).toBeVisible();
  await page.getByRole("button", { name: /configurer|configure/i }).first().click();

  await expect(page.getByRole("heading", { name: /configurateur de recette|recipe configurator/i })).toBeVisible();
  await expect(page.getByText(/ingrédients nécessaires|ingredients needed/i)).toBeVisible();
  await expect(page.getByText(/coût total|total cost/i)).toBeVisible();

  const remove = page.getByRole("button", { name: /retirer de la recette|remove from recipe/i }).first();
  await remove.click();
  await expect(page.getByText(/retiré de cette recette|removed from this recipe/i).first()).toBeVisible();
  await page.getByRole("button", { name: /réintégrer l'ingrédient|restore ingredient/i }).first().click();
  await expect(page.getByText(/retiré de cette recette|removed from this recipe/i)).toHaveCount(0);

  const replacement = page.getByLabel(/remplacer cet ingrédient|replace this ingredient/i).first();
  expect(await replacement.locator("option").count()).toBeGreaterThan(1);
  await replacement.selectOption({ index: 1 });
  await expect(page.getByText(/remplace |replaces /i).first()).toBeVisible();

  const firstStep = page.locator("ol button").first();
  await expect(firstStep).toBeVisible();
  await firstStep.click();
  await expect(firstStep).toHaveAttribute("aria-pressed", "true");
  await expectNoHorizontalOverflow(page);
  await expectNoSeriousA11yViolations(page);
});

test("delivered orders expose carrier tracking and proof without leaking internal notes", async ({ page }) => {
  const deliveredOrder = {
    id: "order-delivered",
    number: "JMA-260902-0098",
    status: "delivered",
    subtotal: 35,
    shippingCost: 6.9,
    vatAmount: 6.98,
    promoDiscount: 0,
    total: 41.9,
    weightGrams: 1800,
    packageCount: 1,
    createdAt: "2026-09-01T09:30:00.000Z",
    deliveryName: "Aminata Koné",
    deliveryAddress: "12 rue des Cultures",
    deliveryCity: "Paris",
    deliveryPostalCode: "75011",
    deliveryCountry: "France",
    deliverySlot: "Mercredi, 14 h - 18 h",
    paymentMethod: "card",
    items: [{ id: "line-proof", productId: "product-1", name: "Attiéké frais", nameFr: "Attiéké frais", nameEn: "Fresh attieke", sku: "JMA-ATT-500", unitPrice: 7, qty: 5, lineTotal: 35, thermalClass: "REFRIGERATED", imageUrl: "/products/attieke.webp", recipeName: null }],
    shipments: [{ id: "shipment-proof", trackingNumber: "JMA-FR-260902-PROOF", thermalClass: "REFRIGERATED", status: "delivered", estimatedDelivery: "2026-09-02T14:00:00.000Z", actualDelivery: "2026-09-02T15:12:00.000Z", confirmCode: "4821", carrier: "Chrono Frais Europe", carrierName: "Chrono Frais Europe", trackingUrl: "https://track.example.com/{ref}", proofPhoto: "/hero-feast-v2.webp", signature: "Aminata Koné" }],
    timeline: [{ status: "paymentConfirmed", label: "Payment confirmed", at: "2026-09-01T09:30:00.000Z", actor: "Système" }, { status: "delivered", label: "Delivered", at: "2026-09-02T15:12:00.000Z", actor: "Chrono Frais Europe" }],
    payments: [{ method: "Carte", status: "captured", amount: 41.9, reference: "pi_proof" }],
  };

  await page.route("**/api/auth/customer/session", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ customer: { id: "customer-proof", email: "aminata@example.fr", phone: "+33600000000", firstName: "Aminata", lastName: "Koné", role: "customer", loyaltyPoints: 200, walletCredit: 0 } }) }));
  await page.route("**/api/orders?*", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ orders: [deliveredOrder] }) }));
  await page.route("**/api/orders/order-delivered?*", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(deliveredOrder) }));

  await page.goto("/?view=orders", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /mes commandes|my orders/i })).toBeVisible();
  await page.getByRole("button", { name: /^(suivre|track)$/i }).click();
  await expect(page.getByRole("heading", { name: "JMA-260902-0098" })).toBeVisible();
  await expect(page.getByRole("link", { name: /suivre chez le transporteur|track with carrier/i })).toHaveAttribute("href", "https://track.example.com/JMA-FR-260902-PROOF");
  await expect(page.getByText(/preuve de remise|delivery proof/i)).toBeVisible();
  await expect(page.getByRole("img", { name: /preuve de livraison|delivery proof/i })).toBeVisible();
  await expect(page.getByText(/reçu par aminata koné|received by aminata koné/i)).toBeVisible();
  await expect(page.locator("body")).not.toContainText(/notes internes|internal operations notes|chaîne du froid contrôlée/i);
  await expectNoHorizontalOverflow(page);
  await expectNoSeriousA11yViolations(page);

  await page.goto("/?view=order-tracking&orderId=order-delivered", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "JMA-260902-0098" })).toBeVisible();
});
