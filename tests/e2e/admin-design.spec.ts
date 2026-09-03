import { expect, type Page, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const now = "2026-09-02T09:30:00.000Z";

const dashboard = {
  kpis: {
    revenueToday: 1842.6,
    revenueMonth: 28742.4,
    orders: 318,
    monthOrders: 94,
    avgBasket: 52.8,
    outOfStock: 2,
    expiringSoon: 4,
    customers: 1860,
    toPrepare: 7,
  },
};

const order = {
  id: "order-1",
  number: "JMA-260902-0142",
  status: "preparing",
  subtotal: 41.8,
  shippingCost: 6.9,
  vatAmount: 8.12,
  promoDiscount: 0,
  total: 48.7,
  weightGrams: 3100,
  packageCount: 2,
  createdAt: now,
  deliveryName: "Aminata Koné",
  customerEmail: "aminata@example.fr",
  customerPhone: "+33 6 00 00 00 00",
  deliveryAddress: "12 rue des Cultures",
  deliveryCity: "Paris",
  deliveryPostalCode: "75011",
  deliveryCountry: "France",
  deliverySlot: "standard",
  paymentMethod: "card",
  items: [{ id: "line-1", nameFr: "Attiéké frais", nameEn: "Fresh attieke", sku: "JMA-ATT-500", unitPrice: 4.9, qty: 2, lineTotal: 9.8, thermalClass: "REFRIGERATED", imageUrl: "/products/attieke.webp" }],
  shipments: [{ id: "shipment-1", trackingNumber: "JMAFR260902", thermalClass: "REFRIGERATED", status: "preparing", estimatedDelivery: "2026-09-04T14:00:00.000Z", carrier: "Chronofresh" }],
  timeline: [{ status: "paymentConfirmed", label: "Paiement confirmé", at: now, actor: "Système" }, { status: "preparing", label: "Préparation lancée", at: "2026-09-02T10:00:00.000Z", actor: "Entrepôt Paris" }],
  payments: [{ method: "Carte", status: "captured", amount: 48.7, reference: "pi_jma_260902" }],
};

const profitabilityRow = {
  id: "attieke",
  label: "Attiéké frais",
  secondary: "Féculents et farines",
  revenue: 4820,
  grossCost: 2795.6,
  margin: 2024.4,
  marginRate: 42,
  units: 712,
  orders: 284,
};

const inventoryBatch = {
  id: "batch-1",
  lotNumber: "ATT-2608-FR",
  productId: "product-1",
  productName: "Attiéké frais",
  productSku: "JMA-ATT-500",
  productImageUrl: "/products/attieke.webp",
  productImageColor: "#F2A900",
  thermalClass: "REFRIGERATED",
  quantity: 120,
  reserved: 36,
  expiryDate: "2026-09-12T00:00:00.000Z",
  receiptDate: "2026-08-29T00:00:00.000Z",
  costPrice: 2.8,
  status: "active",
  warehouseId: "warehouse-1",
  warehouse: "Paris Nord",
};

const inventoryPayload = {
  batches: [inventoryBatch],
  products: [{ id: "product-1", name: "Attiéké frais", sku: "JMA-ATT-500", imageUrl: "/products/attieke.webp", imageColor: "#F2A900", thermalClass: "REFRIGERATED", stockQty: 84 }],
  warehouses: [{ id: "warehouse-1", name: "Paris Nord", city: "Paris", supports: ["AMBIANT", "REFRIGERATED", "FROZEN"] }],
  movements: [{ id: "movement-1", batchId: "batch-1", lotNumber: "ATT-2608-FR", productName: "Attiéké frais", warehouse: "Paris Nord", type: "receipt", quantity: 120, reason: "Arrivage Abidjan", createdAt: now }],
};

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
          .map((property) => ({ element: element.tagName.toLowerCase(), property, color: styles[property] }))
          .filter(({ color }) => isForbidden(color));
      })
      .slice(0, 20);
  });

  expect(forbiddenStyles, `off-brand green, blue or black UI styles remain: ${JSON.stringify(forbiddenStyles)}`).toEqual([]);
}

async function mockAdminApi(page: Page) {
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    let payload: unknown;

    if (path === "/api/admin/session") payload = { user: { email: "direction@je-mange-africain.com", role: "super_admin" } };
    else if (path === "/api/admin/dashboard") payload = dashboard;
    else if (path === "/api/admin/orders/order-1" && request.method() === "PATCH") {
      const body = request.postDataJSON() as {
        status?: string;
        notes?: string;
        shipment?: { id?: string; carrier?: string; trackingNumber?: string; thermalClass?: string; estimatedDelivery?: string; confirmCode?: string; proofPhoto?: string; signature?: string };
      };
      const nextShipment = {
        ...order.shipments[0],
        ...body.shipment,
        id: body.shipment?.id || order.shipments[0].id,
        carrier: body.shipment?.carrier || order.shipments[0].carrier,
        status: body.status === "shipped" ? "picked_up" : order.shipments[0].status,
      };
      const nextTimeline = body.status
        ? [...order.timeline, { status: body.status, label: body.status === "packed" ? "Colis prêt" : body.status, at: "2026-09-02T10:30:00.000Z", actor: "direction@je-mange-africain.com" }]
        : order.timeline;
      payload = {
        updatedShipmentId: nextShipment.id,
        order: {
          status: body.status || order.status,
          notes: body.notes || null,
          shipments: [nextShipment],
          timeline: nextTimeline,
        },
      };
    }
    else if (path === "/api/admin/products") payload = {
      products: [{ id: "product-1", name: "Attiéké frais", nameFr: "Attiéké frais", nameEn: "Fresh attieke", descriptionFr: "Semoule de manioc fermentée, fraîche et légère.", descriptionEn: "Light, fresh fermented cassava couscous.", traditionalName: "Attiéké", sku: "JMA-ATT-500", categoryId: "cat-1", packaging: "Sachet 500 g", costPrice: 2.8, profitMargin: 2.1, costSource: "recorded", price: 4.9, promoPrice: null, stockQty: 84, alertThreshold: 12, netWeightGrams: 500, imageColor: "#E9B949", imageEmoji: "", imageUrl: "/products/attieke.webp", aliases: ["atchéké", "couscous de manioc"], isNew: false, isRecommended: true, isBestseller: true, status: "published", thermalClass: "REFRIGERATED", storageType: "REFRIGERE", country: "Côte d'Ivoire" }],
      total: 1,
    };
    else if (path === "/api/admin/recipes") payload = {
      recipes: [{ id: "recipe-1", title: "Attiéké poisson braisé", description: "Le grand classique ivoirien, composé avec des produits disponibles.", country: "Côte d'Ivoire", category: "Plats", difficulty: "intermediate", timeMinutes: 55, baseServings: 4, imageColor: "#D65A32", imageEmoji: "", imageUrl: "/recipes/attieke-poisson.webp", isPopular: true, isNew: false, isRecommended: true, status: "published", ingredientCount: 8 }],
    };
    else if (path === "/api/orders") payload = { orders: [order] };
    else if (path === "/api/admin/stock" && request.method() === "POST") payload = { batch: { id: "batch-2", lotNumber: "ATT-2609-FR" } };
    else if (path === "/api/admin/stock/batch-1" && request.method() === "PATCH") {
      const body = request.postDataJSON() as { action: "adjust" | "status"; direction?: "increase" | "decrease"; quantity?: number; status?: string };
      payload = body.action === "adjust"
        ? { batch: { id: "batch-1", quantity: inventoryBatch.quantity + (body.direction === "decrease" ? -(body.quantity || 0) : body.quantity || 0), status: inventoryBatch.status }, movement: { quantity: body.quantity || 0 } }
        : { batch: { id: "batch-1", quantity: inventoryBatch.quantity, status: body.status }, movement: { quantity: -inventoryBatch.quantity } };
    }
    else if (path === "/api/admin/stock") payload = inventoryPayload;
    else if (path === "/api/admin/customers/customer-1" && request.method() === "PATCH") payload = { notes: "Cliente fidèle, préfère les produits frais ivoiriens.", updatedAt: now };
    else if (path === "/api/admin/customers/customer-1") payload = {
      customer: { id: "customer-1", email: "aminata@example.fr", name: "Aminata Koné", phone: "+33 6 00 00 00 00", city: "Paris", country: "France", orders: 8, loyalty: 1480, walletCredit: 12.5, preferredLang: "fr", lifetimeValue: 426.4, averageBasket: 53.3, lastOrderAt: now, joinedAt: "2025-11-12T10:00:00.000Z", updatedAt: now, addresses: 2, favorites: 2, savedRecipes: 1, openTickets: 1, segment: "ambassador", notes: "Privilégie les créneaux de livraison du samedi." },
      metrics: { completedOrders: 6, activeOrders: 1, cancelledOrders: 1 },
      addresses: [{ id: "address-1", label: "Maison", recipient: "Aminata Koné", street: "12 rue des Cultures", postalCode: "75011", city: "Paris", country: "France", phone: "+33 6 00 00 00 00", isDefault: true }],
      recentOrders: [{ id: "order-1", number: "JMA-260902-0142", status: "preparing", total: 48.7, createdAt: now, itemCount: 2, paymentMethod: "card", paymentStatus: "captured", items: [{ id: "line-1", name: "Attiéké frais", qty: 2, imageUrl: "/products/attieke.webp" }] }],
      topProducts: [{ productId: "product-1", name: "Attiéké frais", imageUrl: "/products/attieke.webp", quantity: 12, revenue: 58.8 }],
      favorites: [{ id: "favorite-1", productId: "product-1", name: "Attiéké frais", imageUrl: "/products/attieke.webp" }],
      savedRecipes: [{ id: "saved-1", recipeId: "recipe-1", title: "Attiéké poisson braisé", country: "Côte d'Ivoire", imageUrl: "/recipes/attieke-poisson.webp" }],
      tickets: [{ id: "ticket-1", number: "SUP-260901", subject: "Précision sur mon créneau de livraison", priority: "normal", status: "open", assignee: "Service client", updatedAt: now }],
    };
    else if (path === "/api/admin/customers") payload = { customers: [{ id: "customer-1", email: "aminata@example.fr", name: "Aminata Koné", phone: "+33 6 00 00 00 00", city: "Paris", country: "France", orders: 8, loyalty: 1480, walletCredit: 12.5, preferredLang: "fr", lifetimeValue: 426.4, averageBasket: 53.3, lastOrderAt: now, joinedAt: "2025-11-12T10:00:00.000Z", addresses: 2, favorites: 2, savedRecipes: 1, openTickets: 1, segment: "ambassador" }] };
    else if (path === "/api/admin/push" && request.method() === "POST") payload = { campaign: { id: "push-2" }, delivery: { total: 184, sent: 184, failed: 0, configured: true } };
    else if (path === "/api/admin/push") payload = {
      activeSubscriptions: 1284,
      audiences: { all: 1284, signed_in: 932, guests: 352, ambassador: 184, active: 516, at_risk: 126, new: 106 },
      recent: [{ id: "push-1", titleFr: "Le marché du week-end", bodyFr: "Votre sélection ivoirienne est disponible.", sent: true, createdAt: now, type: "promotion", url: "/?view=catalog", audience: "all", recipientCount: 1268, deliveredCount: 1249, failedCount: 19 }],
    };
    else if (path === "/api/admin/advertisements") payload = { advertisements: [{ id: "ad-1", placement: "home", titleFr: "Saveurs de Côte d'Ivoire", titleEn: "Flavours of Côte d'Ivoire", bodyFr: "Une sélection prête à cuisiner.", bodyEn: "A selection ready to cook.", imageUrl: "/hero-feast-v2.webp", imageAltFr: "Table de plats ivoiriens", imageAltEn: "Table of Ivorian dishes", linkUrl: "/?view=catalog", status: "published", priority: 1, startsAt: now, endsAt: "2026-09-30T23:59:59.000Z" }] };
    else if (path === "/api/admin/profitability") payload = {
      general: { ...profitabilityRow, id: "general", label: "Ensemble de l'offre", secondary: null, revenue: 28742.4, grossCost: 16416.8, margin: 12325.6, units: 4260, orders: 1260, marginRate: 42.9 },
      categories: [profitabilityRow],
      lots: [{ ...profitabilityRow, id: "ATT-2608-FR", label: "ATT-2608-FR", secondary: "Attiéké frais" }],
      topProducts: [profitabilityRow],
    };
    else if (path === "/api/admin/audit") payload = { logs: [{ id: "audit-1", action: "price_change", entityType: "product", entityId: "product-1", reason: "Mise à jour du coût fournisseur et de la marge cible.", actor: "direction@je-mange-africain.com", ip: "192.0.2.10", createdAt: now }] };
    else if (path === "/api/categories") payload = { categories: [{ id: "cat-1", name: "Féculents et farines" }, { id: "cat-2", name: "Épices" }] };
    else if (path === "/api/brands") payload = { brands: [{ id: "brand-1", name: "Je mange Africain" }] };
    else if (path === "/api/admin/team") payload = {
      roles: [{ id: "marketing", permissions: { dashboard: ["read"], catalog: ["read"], recipes: ["read"], customers: ["read"], marketing: ["read", "create", "update", "delete"] } }],
      members: [{ id: "member-1", email: "marketing@je-mange-africain.com", firstName: "Mariam", lastName: "Diallo", role: "marketing", status: "active", lastSignInAt: now, createdAt: now, permissions: { dashboard: ["read"], catalog: ["read"], recipes: ["read"], customers: ["read"], marketing: ["read", "create", "update", "delete"] } }],
    };
    else payload = {};

    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(payload) });
  });
}

const sections = [
  { id: "overview", nav: "Décider aujourd'hui", title: "Ce qui demande votre attention" },
  { id: "catalog", nav: "Produits vendus", title: "Ce qui est réellement vendu" },
  { id: "recipes", nav: "Recettes achetables", title: "Construire des recettes achetables" },
  { id: "orders", nav: "Orchestrer les commandes", title: "Du paiement jusqu'à la porte" },
  { id: "inventory", nav: "Tracer les lots", title: "Inventaire piloté par les lots" },
  { id: "customers", nav: "Développer la relation", title: "Piloter chaque relation" },
  { id: "campaigns", nav: "Diffuser sur mobile", title: "Composer, vérifier, diffuser" },
  { id: "advertising", nav: "Piloter les emplacements", title: "Régie publicitaire" },
  { id: "finance", nav: "Mesurer la rentabilité", title: "Rentabilité et encaissements" },
  { id: "governance", nav: "Auditer l'exploitation", title: "Gouverner sans ambiguïté" },
  { id: "team", nav: "Administrer les habilitations", title: "Équipe professionnelle" },
] as const;

test("the professional sign-in owns its bilingual identity and persists the selected language", async ({ page }) => {
  await page.route("**/api/admin/session", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ user: null }),
  }));

  await page.goto("/admin", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Connexion professionnelle" })).toBeVisible();
  await expect(page.locator('img[src*="logo-mark-burgundy"]').filter({ visible: true }).first()).toBeVisible();
  await expect(page).toHaveTitle("Console professionnelle | Je mange Africain");
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await expect(page.locator(".jma-skip-link")).toHaveAttribute("href", "#main-content");
  await expect(page.locator("#main-content")).toBeVisible();
  await page.getByRole("button", { name: "en", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Professional sign in" })).toBeVisible();
  await expect(page.getByText("Professional console", { exact: true }).filter({ visible: true }).first()).toBeVisible();
  await expect(page).toHaveTitle("Professional console | Je mange Africain");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator(".jma-skip-link")).toHaveText("Skip to main content");
  await expect(page.locator("body")).not.toContainText(/my basket|customer sign in|food & groceries/i);
  await expectBrandSafeUiColors(page);

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Professional sign in" })).toBeVisible();
  await expect(page.getByRole("button", { name: "en", exact: true })).toHaveAttribute("aria-pressed", "true");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test("every professional workspace has a clear purpose and stays inside the viewport", async ({ page }) => {
  test.setTimeout(180_000);
  await mockAdminApi(page);
  await page.goto("/admin", { waitUntil: "domcontentloaded" });
  await expect(page.locator("header h1")).toBeVisible();

  const mobile = (page.viewportSize()?.width || 0) < 768;
  for (const section of sections) {
    if (mobile) await page.getByRole("button", { name: "Ouvrir la navigation" }).click();
    const navigation = page.getByRole("navigation", { name: "Navigation professionnelle" });
    await navigation.getByRole("button", { name: new RegExp(`^${section.nav}`) }).click();
    await expect(page.locator("header h1")).toHaveText(section.nav);
    await expect(page.locator("header h1")).toBeFocused();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThanOrEqual(1);
    await expect(page.locator("main").getByRole("heading", { name: section.title })).toBeVisible();
    if (mobile) {
      const workspaceHeader = await page.getByTestId("admin-page-header").boundingBox();
      expect(workspaceHeader?.height || Number.POSITIVE_INFINITY, `${section.nav} uses too much of the first mobile viewport`).toBeLessThanOrEqual(210);
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `${section.nav} overflows horizontally`).toBeLessThanOrEqual(1);
    await expectBrandSafeUiColors(page);
    if (process.env.ADMIN_SCREENSHOTS) {
      const directory = join(process.cwd(), "output", "playwright", "admin-review");
      mkdirSync(directory, { recursive: true });
      await page.screenshot({ path: join(directory, `${section.id}-${mobile ? "mobile" : "desktop"}.png`), fullPage: false });
    }
  }
});

test("admin searches report, filter and clear results consistently", async ({ page }) => {
  await mockAdminApi(page);
  const cases = [
    { hash: "catalog", heading: "Ce qui est réellement vendu", label: "Rechercher un produit", visible: "Attiéké frais" },
    { hash: "recipes", heading: "Construire des recettes achetables", label: "Rechercher une recette", visible: "Attiéké poisson braisé" },
    { hash: "orders", heading: "Du paiement jusqu'à la porte", label: "Rechercher une commande", visible: "JMA-260902-0142" },
    { hash: "inventory", heading: "Inventaire piloté par les lots", label: "Rechercher un lot", visible: "ATT-2608-FR" },
    { hash: "customers", heading: "Piloter chaque relation", label: "Rechercher un client", visible: "Aminata Koné" },
  ] as const;

  for (const item of cases) {
    await page.goto(`/admin#${item.hash}`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: item.heading })).toBeVisible();
    const field = page.getByRole("searchbox", { name: item.label });
    await field.fill("aucun-résultat");
    await expect(page.getByTestId("admin-search-field")).toContainText("0 résultats sur 1");
    await page.getByRole("button", { name: "Effacer la recherche" }).click();
    await expect(field).toHaveValue("");
    await expect(page.getByText(item.visible, { exact: false }).filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByTestId("admin-search-field")).toContainText("1 résultat sur 1");
  }

  await page.goto("/admin#finance", { waitUntil: "domcontentloaded" });
  await page.getByRole("tab", { name: /Encaissements/ }).click();
  const paymentSearch = page.getByRole("searchbox", { name: "Rechercher un encaissement" });
  await paymentSearch.fill("introuvable");
  await expect(page.getByTestId("admin-search-field")).toContainText("0 résultats sur 1");
  await page.getByRole("button", { name: "Effacer la recherche" }).click();
  await expect(paymentSearch).toHaveValue("");
  await expect(page.getByText("pi_jma_260902", { exact: true })).toBeVisible();
});

test("the inventory desk receives, values and secures a traceable batch", async ({ page }) => {
  test.setTimeout(120_000);
  const receiptPayloads: Array<Record<string, unknown>> = [];
  const mutationPayloads: Array<Record<string, unknown>> = [];
  page.on("request", (request) => {
    const path = new URL(request.url()).pathname;
    if (path === "/api/admin/stock" && request.method() === "POST") receiptPayloads.push(request.postDataJSON());
    if (path === "/api/admin/stock/batch-1" && request.method() === "PATCH") mutationPayloads.push(request.postDataJSON());
  });
  await mockAdminApi(page);
  await page.goto("/admin#inventory", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Inventaire piloté par les lots" })).toBeVisible();
  await expect(page.getByText("Valeur brute disponible")).toBeVisible();
  await expect(page.getByText("Derniers mouvements")).toBeVisible();
  const productImages = page.getByRole("img", { name: "Attiéké frais" });
  await expect(productImages.first()).toBeVisible();
  expect(await productImages.first().evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);

  await page.getByRole("button", { name: "Réceptionner un lot" }).click();
  const receiptDialog = page.getByRole("dialog", { name: "Réceptionner un lot traçable" });
  await expect(receiptDialog).toBeVisible();
  await expect(receiptDialog.getByText("Produit et destination")).toBeVisible();
  await expect(receiptDialog.getByText("Identité et calendrier")).toBeVisible();
  await expect(receiptDialog.getByText("Quantité, valeur et disponibilité")).toBeVisible();
  await receiptDialog.getByLabel("Numéro de lot").fill("ATT-2609-FR");
  await receiptDialog.getByLabel("Quantité physique").fill("48");
  await receiptDialog.getByLabel("Coût brut unitaire (€)").fill("2.95");
  await receiptDialog.getByLabel("Motif ou référence de réception").fill("Bon fournisseur ABJ-2609");
  await expect(receiptDialog.getByText("141,60 €", { exact: true })).toBeVisible();
  expect(await receiptDialog.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
  const receiptAccessibility = await new AxeBuilder({ page }).include('[role="dialog"]').withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  const receiptBlocking = receiptAccessibility.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious");
  expect(receiptBlocking, receiptBlocking.map((violation) => `${violation.id}: ${violation.help}`).join("\n")).toEqual([]);
  await expectBrandSafeUiColors(page);
  if (process.env.ADMIN_SCREENSHOTS) {
    const directory = join(process.cwd(), "output", "playwright", "admin-review");
    mkdirSync(directory, { recursive: true });
    await page.screenshot({ path: join(directory, `inventory-receipt-${(page.viewportSize()?.width || 0) < 768 ? "mobile" : "desktop"}.png`), fullPage: false });
  }
  await receiptDialog.getByRole("button", { name: "Enregistrer la réception" }).click();
  await expect(receiptDialog).toBeHidden();
  await expect.poll(() => receiptPayloads.length).toBe(1);
  expect(receiptPayloads[0]).toMatchObject({ productId: "product-1", warehouseId: "warehouse-1", lotNumber: "ATT-2609-FR", quantity: "48", costPrice: "2.95", status: "active" });

  await page.getByRole("button", { name: "Gérer" }).first().click();
  const controlDialog = page.getByRole("dialog", { name: "Attiéké frais" });
  await expect(controlDialog).toBeVisible();
  await expect(controlDialog.getByText("ATT-2608-FR · Paris Nord")).toBeVisible();
  await expect(controlDialog.getByText("84", { exact: true })).toBeVisible();
  await controlDialog.getByLabel("Quantité d'ajustement").fill("6");
  await controlDialog.getByLabel("Motif du mouvement").fill("Comptage physique du matin");
  await controlDialog.getByRole("button", { name: "Appliquer" }).click();
  await expect(controlDialog.getByRole("status")).toContainText("stock vendable");
  await expect.poll(() => mutationPayloads.length).toBe(1);
  expect(mutationPayloads[0]).toMatchObject({ action: "adjust", direction: "increase", quantity: 6 });

  await controlDialog.getByLabel("Motif obligatoire de la décision").fill("Contrôle qualité complémentaire");
  await controlDialog.getByRole("button", { name: "Bloquer temporairement" }).click();
  const confirmation = page.getByRole("alertdialog", { name: "Bloquer temporairement ?" });
  await expect(confirmation).toContainText("retirées de la vente");
  await confirmation.getByRole("button", { name: "Confirmer la décision" }).click();
  await expect.poll(() => mutationPayloads.length).toBe(2);
  expect(mutationPayloads[1]).toMatchObject({ action: "status", status: "blocked", reason: "Contrôle qualité complémentaire" });
  await expect(controlDialog.getByRole("status")).toContainText("disponibilité");

  const overflow = await controlDialog.evaluate((element) => element.scrollWidth - element.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  const results = await new AxeBuilder({ page }).include('[role="dialog"]').withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  const blocking = results.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious");
  expect(blocking, blocking.map((violation) => `${violation.id}: ${violation.help}`).join("\n")).toEqual([]);
  await expectBrandSafeUiColors(page);
  if (process.env.ADMIN_SCREENSHOTS) {
    const directory = join(process.cwd(), "output", "playwright", "admin-review");
    mkdirSync(directory, { recursive: true });
    await page.screenshot({ path: join(directory, `inventory-control-${(page.viewportSize()?.width || 0) < 768 ? "mobile" : "desktop"}.png`), fullPage: false });
  }
});

test("the professional console remains separate from the customer storefront", async ({ page }) => {
  await mockAdminApi(page);
  await page.goto("/admin", { waitUntil: "domcontentloaded" });
  if ((page.viewportSize()?.width || 0) < 768) await page.getByRole("button", { name: "Ouvrir la navigation" }).click();
  await expect(page.getByText("direction@je-mange-africain.com")).toBeVisible();
  await expect(page.locator("body")).not.toContainText(/mon panier|mes favoris|se connecter avec votre compte client/i);
  await expect(page.getByRole("button", { name: /quitter/i })).toBeVisible();
});

test("the product workspace edits bilingual content and calculates the customer price", async ({ page }) => {
  await mockAdminApi(page);
  await page.goto("/admin#catalog", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Ce qui est réellement vendu" })).toBeVisible();
  await page.getByRole("button", { name: "Modifier la fiche Attiéké frais" }).click();

  const dialog = page.getByRole("dialog", { name: "Modifier la fiche produit" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("Nom commercial français")).toHaveValue("Attiéké frais");
  await expect(dialog.getByLabel("Nom commercial anglais")).toHaveValue("Fresh attieke");
  await dialog.getByLabel("Coût brut d'achat (€)").fill("3.20");
  await dialog.getByLabel("Marge bénéficiaire (€)").fill("1.80");
  await expect(dialog.getByText("5,00 €", { exact: true })).toBeVisible();
  await dialog.getByRole("switch", { name: "Activer la vente en gros" }).click();
  await expect(dialog.getByLabel("Conditionnement de gros")).toBeVisible();
  await dialog.getByLabel("Conditionnement de gros").fill("Carton de 6 sachets");
  await expect(dialog.getByLabel("Prix par colis (€)")).toHaveValue("27");
  await expect(dialog.getByText("7,80 €", { exact: true })).toBeVisible();
  await dialog.getByLabel("Palier 2", { exact: true }).fill("5");
  await dialog.getByLabel("Prix (€)", { exact: true }).fill("25");
  await dialog.getByLabel("Palier 3 (colis)", { exact: true }).fill("10");
  await dialog.getByLabel("Prix palier 3 (€)", { exact: true }).fill("23");
  await expect(dialog.getByText(/Le prix doit couvrir le coût brut/)).toHaveCount(0);

  const dialogOverflow = await dialog.evaluate((element) => element.scrollWidth - element.clientWidth);
  expect(dialogOverflow).toBeLessThanOrEqual(1);
  if (process.env.ADMIN_SCREENSHOTS) {
    const directory = join(process.cwd(), "output", "playwright", "admin-review");
    mkdirSync(directory, { recursive: true });
    await page.screenshot({ path: join(directory, `product-edit-${(page.viewportSize()?.width || 0) < 768 ? "mobile" : "desktop"}.png`), fullPage: false });
  }
  const results = await new AxeBuilder({ page }).include('[role="dialog"]').withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  const blocking = results.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious");
  expect(blocking, blocking.map((violation) => `${violation.id}: ${violation.help}`).join("\n")).toEqual([]);
});

test("professional creation studios remain fully English and use brand-safe recipe colours", async ({ page }) => {
  test.setTimeout(150_000);
  const mobile = (page.viewportSize()?.width || 0) < 768;
  const screenshotDirectory = join(process.cwd(), "output", "playwright", "admin-review");
  if (process.env.ADMIN_SCREENSHOTS) mkdirSync(screenshotDirectory, { recursive: true });
  await page.addInitScript(() => localStorage.setItem("jma-admin-locale", "en"));
  await mockAdminApi(page);

  await page.goto("/admin#catalog", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "What is actually sold" })).toBeVisible();
  await page.getByRole("button", { name: "New product" }).click();
  const productDialog = page.getByRole("dialog", { name: "Register a product" });
  await expect(productDialog.getByLabel("French product name")).toBeVisible();
  await expect(productDialog.getByLabel("French description")).toBeVisible();
  await expect(productDialog.getByLabel("Thermal class").locator("option")).toHaveText(["Ambient", "Refrigerated", "Frozen"]);
  await expect(productDialog.getByLabel("Storage").locator("option")).toHaveText(["Dry", "Fresh", "Refrigerated", "Frozen", "Smoked", "Dried", "Preserved"]);
  expect(await productDialog.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
  if (process.env.ADMIN_SCREENSHOTS) await page.screenshot({ path: join(screenshotDirectory, `product-studio-en-${mobile ? "mobile" : "desktop"}.png`) });
  await page.keyboard.press("Escape");

  await page.goto("/admin#recipes", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Build shoppable recipes" })).toBeVisible();
  await page.getByRole("button", { name: "New recipe" }).click();
  const recipeDialog = page.getByRole("dialog", { name: "Compose a shoppable recipe" });
  await expect(recipeDialog.getByLabel("French title")).toBeVisible();
  await expect(recipeDialog.getByLabel("French description")).toBeVisible();
  const palette = recipeDialog.getByRole("group", { name: "Recipe colour palette" });
  await expect(palette.getByRole("button")).toHaveCount(5);
  await expect(palette.getByRole("button", { name: "Burgundy" })).toHaveAttribute("aria-pressed", "true");
  const recipeColours = await palette.getByRole("button").evaluateAll((buttons) => buttons.map((button) => getComputedStyle(button).backgroundColor));
  for (const colour of recipeColours) {
    const values = colour.match(/\d+/g)?.slice(0, 3).map(Number) || [];
    expect(values[1] || 0).not.toBeGreaterThan(Math.max(values[0] || 0, values[2] || 0) * 1.08);
  }
  const paletteBox = await palette.boundingBox();
  const publishingBox = await recipeDialog.getByLabel("Publishing status").boundingBox();
  const controlsOverlap = Boolean(paletteBox && publishingBox
    && paletteBox.x < publishingBox.x + publishingBox.width
    && paletteBox.x + paletteBox.width > publishingBox.x
    && paletteBox.y < publishingBox.y + publishingBox.height
    && paletteBox.y + paletteBox.height > publishingBox.y);
  expect(controlsOverlap).toBe(false);
  expect(await recipeDialog.getByLabel("Unit 1").locator("option").allTextContents()).toEqual(expect.arrayContaining(["piece", "tbsp", "tsp"]));
  expect(await recipeDialog.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
  if (process.env.ADMIN_SCREENSHOTS) {
    await palette.scrollIntoViewIfNeeded();
    await page.screenshot({ path: join(screenshotDirectory, `recipe-studio-en-${mobile ? "mobile" : "desktop"}.png`) });
  }
  await page.keyboard.press("Escape");

  await page.goto("/admin#advertising", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Advertising desk" })).toBeVisible();
  await page.getByRole("button", { name: "New artwork" }).click();
  const advertisingDialog = page.getByRole("dialog", { name: "Compose advertising artwork" });
  await expect(advertisingDialog.getByLabel("French title")).toBeVisible();
  await expect(advertisingDialog.getByLabel("French alternative text")).toBeVisible();
  await expect(advertisingDialog.getByLabel("Placement").locator("option")).toHaveText(["Home", "Catalogue", "Recipes", "Checkout"]);
  await expect(advertisingDialog.getByLabel("Status").locator("option")).toHaveText(["Draft", "Publish", "Disable"]);
  await expect(advertisingDialog.getByRole("button", { name: "Save" })).toBeDisabled();
  await advertisingDialog.getByLabel("Starts").fill("2026-09-04T12:00");
  await advertisingDialog.getByLabel("Ends").fill("2026-09-03T12:00");
  await expect(advertisingDialog.getByRole("alert")).toHaveText("The end date must be later than the start date.");

  const overflow = await advertisingDialog.evaluate((element) => element.scrollWidth - element.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await expectBrandSafeUiColors(page);
  if (process.env.ADMIN_SCREENSHOTS) await page.screenshot({ path: join(screenshotDirectory, `advertising-studio-en-${mobile ? "mobile" : "desktop"}.png`) });
});

test("the order workspace saves logistics and confirms each sensitive advancement", async ({ page }) => {
  await mockAdminApi(page);
  await page.goto("/admin#orders", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Du paiement jusqu'à la porte" })).toBeVisible();
  await page.getByRole("button", { name: /JMA-260902-0142/ }).click();

  const dialog = page.getByRole("dialog", { name: "JMA-260902-0142" });
  await expect(dialog.getByRole("heading", { name: "Préparer, tracer et remettre" })).toBeVisible();
  await expect(dialog.getByText("aminata@example.fr")).toBeVisible();
  await expect(dialog.getByText("Livraison standard")).toBeVisible();
  await dialog.getByLabel("Transporteur").fill("Chrono Frais Europe");
  await dialog.getByLabel("Numéro de suivi").fill("JMA-FR-260902-ADV");
  await dialog.getByLabel("Notes internes d'exploitation").fill("Chaîne du froid contrôlée avant emballage.");
  await dialog.getByRole("button", { name: "Enregistrer la logistique" }).click();
  await expect(dialog.getByRole("status")).toContainText("La fiche logistique est enregistrée.");

  await dialog.getByRole("button", { name: /Passer à Colis prêt/ }).click();
  const confirmation = page.getByRole("alertdialog", { name: "Confirmer l'avancement de la commande ?" });
  await expect(confirmation).toContainText("Tous les articles sont déclarés emballés");
  await confirmation.getByRole("button", { name: "Confirmer l'étape" }).click();
  await expect(dialog.getByRole("status")).toContainText("Colis prêt");
  await expect(dialog.getByText("Colis prêt", { exact: true }).first()).toBeVisible();

  const overflow = await dialog.evaluate((element) => element.scrollWidth - element.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  const results = await new AxeBuilder({ page }).include('[role="dialog"]').withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  const blocking = results.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious");
  expect(blocking, blocking.map((violation) => `${violation.id}: ${violation.help}`).join("\n")).toEqual([]);
});

test("the customer workspace provides a complete and auditable relationship view", async ({ page }) => {
  await mockAdminApi(page);
  await page.goto("/admin#customers", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Piloter chaque relation" })).toBeVisible();
  await expect(page.getByText("426,40 €", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "Ouvrir le profil de Aminata Koné" }).click();

  const dialog = page.getByRole("dialog", { name: "Aminata Koné" });
  await expect(dialog.getByText("Produits les plus achetés")).toBeVisible();
  await expect(dialog.getByText("Attiéké poisson braisé")).toBeVisible();
  await dialog.getByRole("tab", { name: /Commandes/ }).click();
  await expect(dialog.getByText("JMA-260902-0142")).toBeVisible();
  await expect(dialog.getByText("48,70 €")).toBeVisible();
  await dialog.getByRole("tab", { name: /Relation/ }).click();
  await expect(dialog.getByText("Précision sur mon créneau de livraison")).toBeVisible();
  const notes = dialog.getByLabel("Notes internes sur le client");
  await notes.fill("Cliente fidèle, préfère les produits frais ivoiriens.");
  await dialog.getByRole("button", { name: "Enregistrer la note" }).click();
  await expect(dialog.getByRole("status")).toContainText("Note enregistrée et auditée");

  const overflow = await dialog.evaluate((element) => element.scrollWidth - element.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  if (process.env.ADMIN_SCREENSHOTS) {
    const directory = join(process.cwd(), "output", "playwright", "admin-review");
    mkdirSync(directory, { recursive: true });
    await page.screenshot({ path: join(directory, `customer-360-${(page.viewportSize()?.width || 0) < 768 ? "mobile" : "desktop"}.png`), fullPage: false });
  }
  const results = await new AxeBuilder({ page }).include('[role="dialog"]').withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  const blocking = results.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious");
  expect(blocking, blocking.map((violation) => `${violation.id}: ${violation.help}`).join("\n")).toEqual([]);
});

test("push campaigns target a measured audience and preview both languages", async ({ page }) => {
  await mockAdminApi(page);
  await page.goto("/admin#campaigns", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Composer, vérifier, diffuser" })).toBeVisible();
  await expect(page.locator('img[src*="notification-icon-burgundy"]').first()).toBeVisible();
  await page.getByLabel("Titre français").fill("Les saveurs du week-end");
  await page.getByLabel("Message français").fill("Découvrez une sélection ivoirienne préparée pour vous.");
  if ((page.viewportSize()?.width || 0) < 768) {
    await page.getByRole("tablist", { name: "Langue du message" }).getByRole("tab", { name: /EN English/ }).click();
  }
  await page.getByLabel("English title").fill("Weekend flavours");
  await page.getByLabel("English message").fill("Discover an Ivorian selection prepared for you.");
  await page.getByLabel("Audience", { exact: true }).selectOption("ambassador");
  await expect(page.getByText("184 appareil(s) ciblé(s)")).toBeVisible();
  await page.getByLabel("Langue de l’aperçu").getByRole("button", { name: "en", exact: true }).click();
  await expect(page.getByText("Weekend flavours")).toBeVisible();
  if (process.env.ADMIN_SCREENSHOTS) {
    const directory = join(process.cwd(), "output", "playwright", "admin-review");
    mkdirSync(directory, { recursive: true });
    await page.screenshot({ path: join(directory, `push-audience-${(page.viewportSize()?.width || 0) < 768 ? "mobile" : "desktop"}.png`), fullPage: true });
  }

  await page.getByRole("button", { name: "Vérifier puis diffuser" }).click();
  const confirmation = page.getByRole("alertdialog", { name: "Diffuser cette campagne maintenant ?" });
  await expect(confirmation).toContainText("184 appareil(s)");
  await expect(confirmation).toContainText("française ou anglaise");
  await confirmation.getByRole("button", { name: "Confirmer la diffusion" }).click();
  await expect(page.getByRole("status")).toContainText("184 appareil(s) notifié(s)");

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  const blocking = results.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious");
  expect(blocking, blocking.map((violation) => `${violation.id}: ${violation.help}`).join("\n")).toEqual([]);
});

test("advanced recipe, advertising and team editors remain accessible and bounded", async ({ page }) => {
  test.setTimeout(150_000);
  await mockAdminApi(page);

  const editors = [
    { hash: "recipes", title: "Construire des recettes achetables", trigger: "Nouvelle recette", dialog: "Composer une recette achetable" },
    { hash: "advertising", title: "Régie publicitaire", trigger: "Nouvelle affiche", dialog: "Composer une affiche publicitaire" },
    { hash: "team", title: "Équipe professionnelle", trigger: "Inviter un membre", dialog: "Créer un accès professionnel" },
  ];

  for (const editor of editors) {
    await page.goto(`/admin#${editor.hash}`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: editor.title })).toBeVisible();
    await page.getByRole("button", { name: editor.trigger }).click();
    const dialog = page.getByRole("dialog", { name: editor.dialog });
    await expect(dialog).toBeVisible();
    const overflow = await dialog.evaluate((element) => element.scrollWidth - element.clientWidth);
    expect(overflow, `${editor.dialog} overflows horizontally`).toBeLessThanOrEqual(1);
    const results = await new AxeBuilder({ page }).include('[role="dialog"]').withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    const blocking = results.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious");
    expect(blocking, `${editor.dialog}\n${blocking.map((violation) => `${violation.id}: ${violation.help}`).join("\n")}`).toEqual([]);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  }
});
