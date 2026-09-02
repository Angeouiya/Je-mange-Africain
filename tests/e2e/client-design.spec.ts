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
  const categoryHeading = page.getByRole("heading", { name: /marché par univers|shop by universe/i });
  await expect(categoryHeading).toBeVisible();
  const categoryBox = await categoryHeading.boundingBox();
  expect(categoryBox?.y || Number.POSITIVE_INFINITY).toBeLessThan(page.viewportSize()?.height || 0);

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
  const brandNameBox = await dialog.locator(".font-brand").first().boundingBox();
  expect((brandNameBox?.x || 0) + (brandNameBox?.width || 0)).toBeLessThanOrEqual(page.viewportSize()?.width || 0);
  await expectNoHorizontalOverflow(page, dialog);
  await expectNoSeriousA11yViolations(page);

  await page.getByRole("button", { name: /fermer la connexion|close sign-in/i }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByRole("main")).toBeVisible();
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

  await page.getByLabel(/prénom|first name/i).fill("Aminata");
  await page.getByRole("button", { name: /enregistrer mes coordonnées|save my details/i }).click();
  await expect(page.getByText(/coordonnées sont à jour|contact details are up to date/i)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Aminata Traore" })).toBeVisible();

  await page.getByRole("button", { name: /mes adresses|my addresses/i }).click();
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

test("checkout compares delivery services and protects the cold chain", async ({ page }) => {
  const customer = { id: "customer-checkout", email: "awa@example.fr", phone: "+33612345678", firstName: "Awa", lastName: "Traoré", role: "customer", loyaltyPoints: 180, walletCredit: 0 };
  const quoteRequests: Array<Record<string, unknown>> = [];
  await page.addInitScript(({ persistedCustomer }) => {
    localStorage.setItem("jma-store", JSON.stringify({
      state: {
        locale: "fr",
        cart: [{ id: "line-frozen", productId: "product-frozen", name: "Gombo surgelé", nameFr: "Gombo surgelé", nameEn: "Frozen okra", unitPrice: 8.5, unitLabel: "500 g", packWeightGrams: 500, thermalClass: "FROZEN", imageUrl: "/products/gombo.webp", qty: 2, maxStock: 40 }],
        customer: persistedCustomer,
        addresses: [{ id: "address-checkout", label: "Domicile", firstName: "Awa", lastName: "Traoré", street: "12 rue de la Gare", postalCode: "75011", city: "Paris", country: "France", phone: "+33612345678" }],
        favorites: [], savedRecipes: [], recentlyViewed: [], country: "France", postalCode: "75011", coupon: null,
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
  await page.getByRole("button", { name: /passer la commande|place order/i }).click();

  await expect(page.getByRole("heading", { name: /paiement|checkout/i })).toBeVisible();
  await expect(page.getByLabel(/pays de livraison|delivery country/i)).toHaveValue("France");
  const standard = page.getByRole("radio", { name: /standard/i });
  const express = page.getByRole("radio", { name: /express/i });
  const relay = page.getByRole("radio", { name: /relais|collection point/i });
  await expect(standard).toBeChecked();
  await expect(relay).toBeDisabled();
  await expect(page.getByText(/indisponible avec les produits frais ou surgelés|unavailable for chilled or frozen products/i)).toBeVisible();
  await express.check();
  await expect(express).toBeChecked();
  await expect(page.getByText(/flotte interne jma · 12 à 24 h|flotte interne jma · 12-24 h/i)).toBeVisible();

  await page.getByLabel(/pays de livraison|delivery country/i).selectOption("Belgique");
  await expect.poll(() => quoteRequests.at(-1)?.country).toBe("Belgique");
  if (process.env.CLIENT_SCREENSHOTS) {
    await page.getByText(/mode de livraison|delivery option/i).scrollIntoViewIfNeeded();
    await page.screenshot({ path: `output/playwright/audit/checkout-delivery-${(page.viewportSize()?.width || 0) < 768 ? "mobile" : "desktop"}.png`, scale: "css" });
  }
  await expectNoHorizontalOverflow(page);
  await expectNoSeriousA11yViolations(page);
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
      { id: "line-sold-out", productId: "product-2", name: "Piment frais", nameFr: "Piment frais", nameEn: "Fresh chilli", sku: "JMA-PIM-200", unitPrice: 4, qty: 1, lineTotal: 4, thermalClass: "REFRIGERATED", imageUrl: "/products/piment.webp", recipeId: null, recipeName: null, unitLabel: "Barquette 200 g", packWeightGrams: 200, maxStock: 0, purchasable: false },
    ],
    shipments: [{ id: "shipment-proof", trackingNumber: "JMA-FR-260902-PROOF", thermalClass: "REFRIGERATED", status: "delivered", estimatedDelivery: "2026-09-02T14:00:00.000Z", actualDelivery: "2026-09-02T15:12:00.000Z", confirmCode: "4821", carrier: "Chrono Frais Europe", carrierName: "Chrono Frais Europe", trackingUrl: "https://track.example.com/{ref}", proofPhoto: "/hero-feast-v2.webp", signature: "Aminata Koné" }],
    timeline: [{ status: "paymentConfirmed", label: "Payment confirmed", at: "2026-09-01T09:30:00.000Z", actor: null }, { status: "delivered", label: "Delivered", at: "2026-09-02T15:12:00.000Z", actor: null }],
    payments: [{ method: "Carte", status: "captured", amount: 45.9, reference: "pi_proof" }],
  };

  await page.route("**/api/auth/customer/session", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ customer: { id: "customer-proof", email: "aminata@example.fr", phone: "+33600000000", firstName: "Aminata", lastName: "Koné", role: "customer", loyaltyPoints: 200, walletCredit: 0 } }) }));
  await page.route("**/api/orders?*", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ orders: [deliveredOrder] }) }));
  await page.route("**/api/orders/order-delivered?*", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(deliveredOrder) }));

  await page.goto("/?view=orders", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /mes commandes|my orders/i })).toBeVisible();
  await expect(page.getByLabel(/n° de commande ou produit|order number or product/i)).toBeVisible();
  await page.getByLabel(/n° de commande ou produit|order number or product/i).fill("attiéké");
  await expect(page.getByText("JMA-260902-0098")).toBeVisible();
  await page.getByLabel(/n° de commande ou produit|order number or product/i).fill("introuvable");
  await expect(page.getByText(/aucune commande ne correspond|no order matches/i)).toBeVisible();
  await page.getByRole("button", { name: /réinitialiser|reset/i }).click();
  await page.getByRole("button", { name: /livrées|delivered/i }).click();
  await expect(page.getByRole("button", { name: /livrées|delivered/i })).toHaveAttribute("aria-pressed", "true");
  if (process.env.CLIENT_SCREENSHOTS) {
    await page.screenshot({ path: `output/playwright/audit/orders-center-${(page.viewportSize()?.width || 0) < 768 ? "mobile" : "desktop"}.png`, fullPage: true, scale: "css" });
  }
  await page.getByRole("button", { name: /recommander|reorder/i }).click();
  await expect(page.getByRole("alertdialog")).toContainText(/partiellement disponible|partially available/i);
  await page.getByRole("button", { name: /continuer|continue/i }).click();
  await expect(page.getByText(/attiéké frais|fresh attieke/i).first()).toBeVisible();
  await expect(page.getByText(/22,50 €|€22\.50/).first()).toBeVisible();
  await expect(page.locator("main")).not.toContainText(/piment frais|fresh chilli/i);

  await page.goto("/?view=orders", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /^(suivre|track)$/i }).click();
  await expect(page.getByRole("heading", { name: "JMA-260902-0098" })).toBeVisible();
  await expect(page.getByText(/livraison standard|standard delivery/i).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /facture|invoice/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /suivre chez le transporteur|track with carrier/i })).toHaveAttribute("href", "https://track.example.com/JMA-FR-260902-PROOF");
  await expect(page.getByText(/preuve de remise|delivery proof/i)).toBeVisible();
  await expect(page.getByRole("img", { name: /preuve de livraison|delivery proof/i })).toBeVisible();
  await expect(page.getByText(/reçu par aminata koné|received by aminata koné/i)).toBeVisible();
  await expect(page.locator("body")).not.toContainText(/notes internes|internal operations notes|chaîne du froid contrôlée/i);
  await expectNoHorizontalOverflow(page);
  await expectNoSeriousA11yViolations(page);
  if (process.env.CLIENT_SCREENSHOTS) {
    await page.screenshot({ path: `output/playwright/audit/order-tracking-${(page.viewportSize()?.width || 0) < 768 ? "mobile" : "desktop"}.png`, fullPage: true, scale: "css" });
  }

  await page.goto("/?view=order-tracking&orderId=order-delivered", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "JMA-260902-0098" })).toBeVisible();
});
