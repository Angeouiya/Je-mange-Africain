import { expect, type Page, test } from "@playwright/test";
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
  deliveryAddress: "12 rue des Cultures",
  deliveryCity: "Paris",
  deliveryPostalCode: "75011",
  deliveryCountry: "France",
  deliverySlot: "Jeudi, 14 h - 18 h",
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

async function mockAdminApi(page: Page) {
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    let payload: unknown;

    if (path === "/api/admin/session") payload = { user: { email: "direction@je-mange-africain.com", role: "super_admin" } };
    else if (path === "/api/admin/dashboard") payload = dashboard;
    else if (path === "/api/admin/products") payload = {
      products: [{ id: "product-1", name: "Attiéké frais", traditionalName: "Attiéké", sku: "JMA-ATT-500", costPrice: 2.8, profitMargin: 2.1, costSource: "recorded", price: 4.9, stockQty: 84, alertThreshold: 12, imageColor: "#E9B949", imageEmoji: "", imageUrl: "/products/attieke.webp", isNew: false, isRecommended: true, isBestseller: true, status: "published", thermalClass: "REFRIGERATED", country: "Côte d'Ivoire" }],
      total: 1,
    };
    else if (path === "/api/admin/recipes") payload = {
      recipes: [{ id: "recipe-1", title: "Attiéké poisson braisé", description: "Le grand classique ivoirien, composé avec des produits disponibles.", country: "Côte d'Ivoire", category: "Plats", difficulty: "intermediate", timeMinutes: 55, baseServings: 4, imageColor: "#D65A32", imageEmoji: "", imageUrl: "/recipes/attieke-poisson.webp", isPopular: true, isNew: false, isRecommended: true, status: "published", ingredientCount: 8 }],
    };
    else if (path === "/api/orders") payload = { orders: [order] };
    else if (path === "/api/admin/stock") payload = { batches: [{ id: "batch-1", lotNumber: "ATT-2608-FR", productId: "product-1", productName: "Attiéké frais", quantity: 120, reserved: 36, expiryDate: "2026-09-12T00:00:00.000Z", receiptDate: "2026-08-29T00:00:00.000Z", costPrice: 2.8, status: "active", warehouse: "Paris Nord" }] };
    else if (path === "/api/admin/customers") payload = { customers: [{ id: "customer-1", email: "aminata@example.fr", name: "Aminata Koné", city: "Paris", orders: 8, loyalty: 1480, walletCredit: 12.5, preferredLang: "fr" }] };
    else if (path === "/api/admin/push") payload = { activeSubscriptions: 1284, recent: [{ id: "push-1", titleFr: "Le marché du week-end", bodyFr: "Votre sélection ivoirienne est disponible.", sent: true, createdAt: now, type: "promotion" }] };
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
  { id: "customers", nav: "Développer la relation", title: "Comprendre chaque relation" },
  { id: "campaigns", nav: "Diffuser sur mobile", title: "Composer, vérifier, diffuser" },
  { id: "advertising", nav: "Piloter les emplacements", title: "Régie publicitaire" },
  { id: "finance", nav: "Mesurer la rentabilité", title: "Rentabilité et encaissements" },
  { id: "governance", nav: "Auditer l'exploitation", title: "Gouverner sans ambiguïté" },
  { id: "team", nav: "Administrer les habilitations", title: "Équipe professionnelle" },
] as const;

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
    await expect(page.locator("main").getByRole("heading", { name: section.title })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `${section.nav} overflows horizontally`).toBeLessThanOrEqual(1);
    if (process.env.ADMIN_SCREENSHOTS) {
      const directory = join(process.cwd(), "output", "playwright", "admin-review");
      mkdirSync(directory, { recursive: true });
      await page.screenshot({ path: join(directory, `${section.id}-${mobile ? "mobile" : "desktop"}.png`), fullPage: false });
    }
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
