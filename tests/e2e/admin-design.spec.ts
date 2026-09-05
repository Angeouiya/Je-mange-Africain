import { expect, type Page, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const now = "2026-09-02T09:30:00.000Z";

const dashboard = {
  generatedAt: now,
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
    activeOrders: 23,
    inDelivery: 6,
    paymentAttention: 3,
    newCustomersMonth: 48,
    stockCoverageRate: 97.4,
  },
  comparison: { revenue: 12.4, orders: 8.6, averageBasket: 3.8 },
  storefront: {
    publishedProducts: 78,
    availableProducts: 76,
    productsMissingImages: 1,
    publishedRecipes: 24,
    purchasableRecipes: 22,
    recipesMissingImages: 1,
    activePromotions: 3,
    liveAdvertisements: 4,
  },
  pulse: [
    { date: "2026-08-27T00:00:00.000Z", label: "jeu", revenue: 2480, orders: 42 },
    { date: "2026-08-28T00:00:00.000Z", label: "ven", revenue: 3210, orders: 54 },
    { date: "2026-08-29T00:00:00.000Z", label: "sam", revenue: 4680, orders: 71 },
    { date: "2026-08-30T00:00:00.000Z", label: "dim", revenue: 2870, orders: 46 },
    { date: "2026-08-31T00:00:00.000Z", label: "lun", revenue: 3560, orders: 58 },
    { date: "2026-09-01T00:00:00.000Z", label: "mar", revenue: 3940, orders: 62 },
    { date: "2026-09-02T00:00:00.000Z", label: "mer", revenue: 1842.6, orders: 31 },
  ],
  workflow: [{ id: "validate", count: 7 }, { id: "prepare", count: 10 }, { id: "deliver", count: 6 }, { id: "closed", count: 295 }],
  priorities: [
    { id: "delivery-delay", level: "critical", count: 2, title: "Livraisons hors délai", detail: "Les dates estimées sont dépassées et demandent un suivi transporteur.", target: "orders" },
    { id: "payment", level: "attention", count: 3, title: "Paiements à rapprocher", detail: "Les paiements en attente ou en échec du mois doivent être examinés.", target: "finance" },
    { id: "stockout", level: "attention", count: 2, title: "Produits indisponibles", detail: "L'offre publiée n'est plus vendable avec le stock actuellement disponible.", target: "inventory" },
    { id: "expiry", level: "monitor", count: 4, title: "Échéances sous 14 jours", detail: "Priorisez ces lots dans les prochaines vagues selon la règle FEFO.", target: "inventory" },
  ],
  recentOrders: [{ id: "order-1", number: "JMA-260902-0142", status: "preparing", total: 48.7, createdAt: now, deliveryName: "Aminata Koné", deliveryCity: "Paris", itemCount: 2, imageUrl: "/products/attieke.webp" }],
  topProducts: [
    { productId: "product-1", name: "Attiéké frais", imageUrl: "/products/attieke.webp", imageColor: "#E9B949", units: 712, revenue: 4820 },
    { productId: "product-2", name: "Banane plantain", imageUrl: "/products/banane-plantain.webp", imageColor: "#F2A900", units: 648, revenue: 3910 },
    { productId: "product-3", name: "Akpi", imageUrl: "/products/akpi.webp", imageColor: "#C84C2E", units: 288, revenue: 2160 },
  ],
};

const promotionsPayload = {
  promotions: [
    { id: "promotion-1", code: "BIENVENUE10", type: "percent", value: 10, minOrder: 30, appliesTo: "all", targetId: null, startsAt: "2020-09-01T08:00:00.000Z", endsAt: "2090-09-30T22:00:00.000Z", usageLimit: 100, usedCount: 12, active: true, createdAt: now },
    { id: "promotion-2", code: "FR-LIVRAISON", type: "free_shipping", value: 0, minOrder: 50, appliesTo: "country", targetId: "France", startsAt: "2090-09-20T08:00:00.000Z", endsAt: null, usageLimit: 50, usedCount: 0, active: true, createdAt: now },
  ],
};

const dishTemplatePayload = {
  countries: ["Côte d'Ivoire", "Sénégal", "Cameroun"],
  dishes: [{
    slug: "garba-ivoirien",
    nameFr: "Garba ivoirien",
    nameEn: "Ivorian garba",
    country: "Côte d'Ivoire",
    region: "Abidjan",
    category: "street-food",
    difficulty: "easy",
    timeMinutes: 25,
    servings: 4,
    featured: true,
    descriptionFr: "Attiéké servi avec du thon frit, des oignons, de la tomate et du piment frais.",
    descriptionEn: "Attieke served with fried tuna, onions, tomato and fresh chilli.",
    recommendationScore: 12,
    ingredients: [
      { nameFr: "Attiéké", nameEn: "Attieke", quantity: "600 g", role: "base", optional: false },
      { nameFr: "Thon frais", nameEn: "Fresh tuna", quantity: "600 g", role: "protein", optional: false },
    ],
    stepsFr: ["Saler le thon et le laisser reposer dix minutes.", "Frire le thon puis servir avec l'attiéké chaud."],
    stepsEn: ["Salt the tuna and leave it to rest for ten minutes.", "Fry the tuna, then serve it with warm attieke."],
  }],
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
  items: [{ id: "line-1", variantId: "variant-attieke-500", variantLabel: "Sachet 500 g", nameFr: "Attiéké frais", nameEn: "Fresh attieke", sku: "JMA-ATT-500", unitPrice: 4.9, qty: 2, lineTotal: 9.8, thermalClass: "REFRIGERATED", imageUrl: "/products/attieke.webp" }],
  shipments: [{ id: "shipment-1", trackingNumber: "JMAFR260902", thermalClass: "REFRIGERATED", status: "preparing", estimatedDelivery: "2026-09-04T14:00:00.000Z", carrier: "Chronofresh" }],
  timeline: [{ status: "paymentConfirmed", label: "Paiement confirmé", at: now, actor: "Système" }, { status: "preparing", label: "Préparation lancée", at: "2026-09-02T10:00:00.000Z", actor: "Entrepôt Paris" }],
  payments: [
    { id: "payment-1", method: "card", status: "captured", amount: 48.7, reference: "pi_jma_260902", createdAt: now },
    { id: "payment-2", method: "apple_pay", status: "pending", amount: 32.4, reference: "pi_jma_pending", createdAt: "2026-09-02T09:35:00.000Z" },
    { id: "payment-3", method: "paypal", status: "failed", amount: 64.9, reference: "pi_jma_failed", createdAt: "2026-09-02T09:40:00.000Z" },
  ],
  refunds: [] as Array<{ id: string; amount: number; status: string; reason?: string; createdAt: string }>,
};

type PaymentLedgerOrder = Pick<typeof order, "id" | "number" | "status" | "deliveryName" | "deliveryCountry" | "payments" | "refunds">;

function paymentLedgerPayload(currentOrder: PaymentLedgerOrder, url: URL) {
  const filter = url.searchParams.get("filter") || "all";
  const query = (url.searchParams.get("query") || "").toLowerCase();
  const page = Number(url.searchParams.get("page") || 1);
  const pageSize = Number(url.searchParams.get("pageSize") || 24);
  const refundPaymentId = currentOrder.payments.find((payment) => ["captured", "refunded"].includes(payment.status))?.id;
  const allRows = currentOrder.payments.map((payment) => ({
    ...payment,
    orderId: currentOrder.id,
    orderNumber: currentOrder.number,
    orderStatus: currentOrder.status,
    date: payment.createdAt,
    customer: currentOrder.deliveryName,
    country: currentOrder.deliveryCountry,
    currency: "EUR",
    refunds: payment.id === refundPaymentId ? currentOrder.refunds : [],
  }));
  const matchesFilter = (payment: (typeof allRows)[number]) => filter === "all"
    || (filter === "captured" && ["captured", "refunded"].includes(payment.status))
    || (filter === "pending" && ["pending", "authorized"].includes(payment.status))
    || (filter === "refunds" && payment.refunds.length > 0)
    || (filter === "exceptions" && payment.status === "failed");
  const searchedRows = allRows.filter((payment) => matchesFilter(payment) && `${payment.reference} ${payment.orderNumber} ${payment.customer} ${payment.method} ${payment.country}`.toLowerCase().includes(query));
  const first = (page - 1) * pageSize;
  const captured = allRows.filter((payment) => ["captured", "refunded"].includes(payment.status));
  const pending = allRows.filter((payment) => ["pending", "authorized"].includes(payment.status));
  const exceptions = allRows.filter((payment) => payment.status === "failed");
  const completedRefunds = currentOrder.refunds.filter((refund) => refund.status === "completed");
  const pendingRefunds = currentOrder.refunds.filter((refund) => refund.status === "pending");
  const refundedAmount = completedRefunds.reduce((sum, refund) => sum + refund.amount, 0);
  const methods = allRows.map((payment) => ({
    method: payment.method,
    family: payment.method === "card" ? "card" : "wallet",
    count: 1,
    amount: payment.amount,
    share: (payment.amount / allRows.reduce((sum, row) => sum + row.amount, 0)) * 100,
  }));
  const pageCount = Math.max(1, Math.ceil(searchedRows.length / pageSize));
  return {
    rows: searchedRows.slice(first, first + pageSize),
    summary: {
      netCapturedAmount: Math.max(0, captured.reduce((sum, payment) => sum + payment.amount, 0) - refundedAmount),
      grossCapturedAmount: captured.reduce((sum, payment) => sum + payment.amount, 0),
      capturedCount: captured.length,
      pendingAmount: pending.reduce((sum, payment) => sum + payment.amount, 0),
      pendingCount: pending.length,
      refundedAmount,
      refundCount: currentOrder.refunds.length,
      pendingRefundAmount: pendingRefunds.reduce((sum, refund) => sum + refund.amount, 0),
      exceptionAmount: exceptions.reduce((sum, payment) => sum + payment.amount, 0),
      exceptionCount: exceptions.length,
      reconciliationRate: allRows.length ? (captured.length / allRows.length) * 100 : 0,
    },
    counts: { all: allRows.length, captured: captured.length, pending: pending.length, refunds: currentOrder.refunds.length ? 1 : 0, exceptions: exceptions.length },
    methods,
    coverage: { countries: [currentOrder.deliveryCountry], currencies: ["EUR"], familyCount: 2 },
    pagination: { page, pageSize, pageCount, totalRows: searchedRows.length, hasPrevious: page > 1, hasNext: page < pageCount },
    period: url.searchParams.get("period") || "30d",
  };
}

const customerRecords = [
  { id: "customer-1", email: "aminata@example.fr", name: "Aminata Koné", phone: "+33 6 00 00 00 00", city: "Paris", country: "France", orders: 8, loyalty: 1480, walletCredit: 12.5, preferredLang: "fr", lifetimeValue: 426.4, averageBasket: 53.3, lastOrderAt: now, joinedAt: "2025-11-12T10:00:00.000Z", addresses: 2, favorites: 2, savedRecipes: 1, openTickets: 1, segment: "ambassador" },
  { id: "customer-2", email: "idrissa@example.be", name: "Idrissa Traoré", phone: "+32 470 00 00 00", city: "Bruxelles", country: "Belgique", orders: 9, loyalty: 920, walletCredit: 0, preferredLang: "fr", lifetimeValue: 612, averageBasket: 68, lastOrderAt: "2026-05-01T10:00:00.000Z", joinedAt: "2024-10-08T10:00:00.000Z", addresses: 1, favorites: 1, savedRecipes: 0, openTickets: 0, segment: "at_risk" },
  { id: "customer-3", email: "awa@example.fr", name: "Awa Diop", phone: "+33 7 00 00 00 00", city: "Lyon", country: "France", orders: 0, loyalty: 80, walletCredit: 0, preferredLang: "fr", lifetimeValue: 0, averageBasket: 0, lastOrderAt: null, joinedAt: "2026-08-01T10:00:00.000Z", addresses: 1, favorites: 0, savedRecipes: 0, openTickets: 0, segment: "new" },
  { id: "customer-4", email: "chiamaka@example.co.uk", name: "Chiamaka Okafor", phone: "+44 7700 900000", city: "London", country: "Royaume-Uni", orders: 3, loyalty: 360, walletCredit: 5, preferredLang: "en", lifetimeValue: 138, averageBasket: 46, lastOrderAt: "2026-08-29T10:00:00.000Z", joinedAt: "2026-03-11T10:00:00.000Z", addresses: 1, favorites: 2, savedRecipes: 1, openTickets: 0, segment: "active" },
  { id: "customer-5", email: "mariam@example.de", name: "Mariam Diallo", phone: "+49 151 000000", city: "Berlin", country: "Allemagne", orders: 6, loyalty: 1720, walletCredit: 18, preferredLang: "en", lifetimeValue: 380, averageBasket: 63.33, lastOrderAt: "2026-08-30T10:00:00.000Z", joinedAt: "2025-08-20T10:00:00.000Z", addresses: 1, favorites: 1, savedRecipes: 2, openTickets: 0, segment: "ambassador" },
  { id: "customer-6", email: "koffi@example.fr", name: "Koffi N'Guessan", phone: null, city: "Marseille", country: "France", orders: 1, loyalty: 120, walletCredit: 0, preferredLang: "fr", lifetimeValue: 62, averageBasket: 62, lastOrderAt: "2026-08-25T10:00:00.000Z", joinedAt: "2026-07-15T10:00:00.000Z", addresses: 0, favorites: 0, savedRecipes: 0, openTickets: 0, segment: "active" },
] as const;

const customerPortfolioPayload = {
  generatedAt: now,
  customers: customerRecords,
  summary: {
    total: 6,
    lifetimeValue: 1618.4,
    averageCustomerValue: 269.73,
    averageBasket: 59.94,
    totalOrders: 27,
    repeatCustomers: 4,
    repeatRate: 80,
    profileCoverageRate: 83.3,
    savedIntentRate: 66.7,
    openTickets: 1,
    atRiskValue: 612,
    actionable: 4,
    segments: { ambassador: 2, active: 2, at_risk: 1, new: 1 },
    markets: 4,
    languages: { fr: 4, en: 2, other: 0 },
  },
  actions: [
    { id: "support:customer-1", customerId: "customer-1", customerName: "Aminata Koné", kind: "support", level: "critical", score: 524.2, count: 1, value: 426.4, daysSinceActivity: 1 },
    { id: "reengage:customer-2", customerId: "customer-2", customerName: "Idrissa Traoré", kind: "reengage", level: "attention", score: 406.1, count: 9, value: 612, daysSinceActivity: 125 },
    { id: "activate:customer-3", customerId: "customer-3", customerName: "Awa Diop", kind: "activate", level: "attention", score: 303.3, count: 0, value: 0, daysSinceActivity: 33 },
    { id: "complete:customer-6", customerId: "customer-6", customerName: "Koffi N'Guessan", kind: "complete_profile", level: "attention", score: 200.6, count: 0, value: 62, daysSinceActivity: 9 },
    { id: "reward:customer-5", customerId: "customer-5", customerName: "Mariam Diallo", kind: "reward", level: "opportunity", score: 102.3, count: 6, value: 380, daysSinceActivity: 4 },
  ],
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

const profitabilityPayload = {
  period: "30d",
  generatedAt: now,
  general: { ...profitabilityRow, id: "general", label: "Ensemble de l'offre", secondary: null, revenue: 28742.4, grossCost: 16416.8, margin: 12325.6, units: 4260, orders: 1260, marginRate: 42.9, traceabilityRate: 86.4 },
  categories: [
    { ...profitabilityRow, contributionRate: 16.8 },
    { ...profitabilityRow, id: "epices", label: "Épices et condiments", revenue: 3760, grossCost: 1880, margin: 1880, marginRate: 50, units: 594, orders: 238, contributionRate: 13.1 },
  ],
  lots: [
    { ...profitabilityRow, id: "ATT-2608-FR", label: "ATT-2608-FR", secondary: "Attiéké frais · Paris Nord", contributionRate: 16.8 },
    { ...profitabilityRow, id: "AKP-2608-CI", label: "AKP-2608-CI", secondary: "Akpi · Lyon Est", revenue: 2160, grossCost: 1120, margin: 1040, marginRate: 48.1, units: 288, orders: 146, contributionRate: 7.5 },
  ],
  topProducts: [
    { ...profitabilityRow, id: "product-1", secondary: "JMA-ATT-500", contributionRate: 16.8, imageUrl: "/products/attieke.webp", imageColor: "#E9B949", country: "Côte d'Ivoire", stockQty: 16, reservedQty: 12, availableStock: 4, alertThreshold: 12 },
    { ...profitabilityRow, id: "product-2", label: "Banane plantain", secondary: "JMA-PLA-1KG", revenue: 3910, grossCost: 2250, margin: 1660, marginRate: 42.5, units: 648, orders: 246, contributionRate: 13.6, imageUrl: "/products/banane-plantain.webp", imageColor: "#F2A900", country: "Cameroun", stockQty: 96, reservedQty: 18, availableStock: 78, alertThreshold: 15 },
    { ...profitabilityRow, id: "product-3", label: "Akpi", secondary: "JMA-AKP-100", revenue: 2160, grossCost: 1850, margin: 310, marginRate: 14.4, units: 288, orders: 146, contributionRate: 7.5, imageUrl: "/products/akpi.webp", imageColor: "#C84C2E", country: "Côte d'Ivoire", stockQty: 54, reservedQty: 4, availableStock: 50, alertThreshold: 8 },
  ],
  recommendations: [
    { id: "restock:product-1", kind: "restock", productId: "product-1", label: "Attiéké frais", detail: "4 unités disponibles pour un seuil de 12." },
    { id: "priority:product-2", kind: "priority", productId: "product-2", label: "Banane plantain", detail: "N° 2 des ventes avec 648 unités achetées." },
    { id: "margin:product-3", kind: "margin", productId: "product-3", label: "Akpi", detail: "Le taux de marge de 14,4 % mérite une révision." },
  ],
  comparison: { revenue: 12.4, grossCost: 8.2, margin: 18.6, units: 9.7, previous: { ...profitabilityRow, id: "general-previous" } },
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

const logisticsPayload = {
  carriers: [
    { id: "carrier-fresh", name: "Chrono Frais", logo: null, trackingUrl: "https://track.example.com/{ref}", rating: 5, shipmentCount: 38, zoneCount: 1 },
    { id: "carrier-relay", name: "DPD Europe", logo: null, trackingUrl: "https://track.example.com/{ref}", rating: 4, shipmentCount: 21, zoneCount: 1 },
    { id: "carrier-jma", name: "JMA Express", logo: null, trackingUrl: null, rating: 5, shipmentCount: 12, zoneCount: 1 },
  ],
  zones: [
    { id: "zone-standard", carrierId: "carrier-fresh", carrier: "Chrono Frais", country: "France", postalPattern: null, service: "standard", baseFee: 4.9, perKgFee: 0.6, frozenSurcharge: 2.5, minDelayHours: 48 },
    { id: "zone-express", carrierId: "carrier-jma", carrier: "JMA Express", country: "France", postalPattern: "75*", service: "express", baseFee: 6.9, perKgFee: 0.9, frozenSurcharge: 3.5, minDelayHours: 24 },
    { id: "zone-relay", carrierId: "carrier-relay", carrier: "DPD Europe", country: "France", postalPattern: null, service: "relay", baseFee: 3.5, perKgFee: 0.45, frozenSurcharge: 0, minDelayHours: 72 },
  ],
  summary: { carriers: 3, routes: 3, countries: 1, coldChainRoutes: 2, serviceCounts: { standard: 1, express: 1, relay: 1 } },
};

const auditPayload = {
  period: "30d",
  generatedAt: now,
  hasMore: false,
  summary: {
    total: 3,
    loaded: 3,
    actors: 2,
    risk: { critical: 2, attention: 1, routine: 0 },
    domains: { access: 1, stock: 1, catalog: 1, fulfillment: 0, customers: 0, marketing: 0, finance: 0, system: 0 },
    evidenceRate: 86.7,
    networkRate: 66.7,
  },
  logs: [
    {
      id: "audit-1",
      action: "price_change",
      entityType: "product",
      entityId: "product-1",
      reason: "Mise à jour du coût fournisseur et de la marge cible.",
      actor: "direction@je-mange-africain.com",
      actorSource: "identity",
      ip: "192.0.2.10",
      risk: "attention",
      domain: "catalog",
      evidenceScore: 100,
      changes: [
        { field: "costPrice", before: "2.5", after: "2.8", kind: "changed" },
        { field: "profitMargin", before: "1.9", after: "2.1", kind: "changed" },
      ],
      createdAt: now,
    },
    {
      id: "audit-2",
      action: "team_member_delete",
      entityType: "team_member",
      entityId: "member-2",
      reason: "Accès retiré après le départ du collaborateur, par direction@je-mange-africain.com.",
      actor: "direction@je-mange-africain.com",
      actorSource: "reason",
      ip: null,
      risk: "critical",
      domain: "access",
      evidenceScore: 80,
      changes: [{ field: "status", before: "active", after: "deleted", kind: "changed" }],
      createdAt: "2026-09-02T08:45:00.000Z",
    },
    {
      id: "audit-3",
      action: "batch_status_change",
      entityType: "inventory_batch",
      entityId: "ATT-2608-FR",
      reason: "Rappel préventif après contrôle qualité du lot.",
      actor: "qualite@je-mange-africain.com",
      actorSource: "identity",
      ip: "192.0.2.18",
      risk: "critical",
      domain: "stock",
      evidenceScore: 80,
      changes: [{ field: "status", before: "active", after: "recalled", kind: "changed" }],
      createdAt: "2026-09-02T08:15:00.000Z",
    },
  ],
};

const teamRoleCatalog = [
  { id: "super_admin", assignable: false, permissions: { dashboard: ["read", "create", "update", "delete"], catalog: ["read", "create", "update", "delete"], recipes: ["read", "create", "update", "delete"], orders: ["read", "create", "update", "delete"], stock: ["read", "create", "update", "delete"], logistics: ["read", "create", "update", "delete"], customers: ["read", "create", "update", "delete"], marketing: ["read", "create", "update", "delete"], finance: ["read", "create", "update", "delete"], audit: ["read", "create", "update", "delete"], team: ["read", "create", "update", "delete"], settings: ["read", "create", "update", "delete"] } },
  { id: "marketing", assignable: true, permissions: { dashboard: ["read"], catalog: ["read"], recipes: ["read"], customers: ["read"], marketing: ["read", "create", "update", "delete"] } },
  { id: "logistics", assignable: true, permissions: { dashboard: ["read"], orders: ["read", "update"], logistics: ["read", "create", "update", "delete"], customers: ["read"] } },
  { id: "accounting", assignable: true, permissions: { dashboard: ["read"], orders: ["read"], stock: ["read"], finance: ["read", "update"], audit: ["read"] } },
  { id: "support", assignable: true, permissions: { dashboard: ["read"], orders: ["read"], customers: ["read", "update"] } },
  { id: "catalog_manager", assignable: true, permissions: { dashboard: ["read"], catalog: ["read", "create", "update", "delete"], recipes: ["read"], stock: ["read"] } },
];

const teamPayload = {
  roles: teamRoleCatalog.filter((role) => role.assignable),
  roleCatalog: teamRoleCatalog,
  modules: ["dashboard", "catalog", "recipes", "orders", "stock", "logistics", "customers", "marketing", "finance", "audit", "team", "settings"],
  actions: ["read", "create", "update", "delete"],
  summary: { total: 5, active: 3, invited: 1, suspended: 1, protected: 1, delegatedRoles: 2, coveredModules: 6, totalModules: 12, recentlyActive: 2, dormant: 0 },
  members: [
    { id: "super-1", email: "direction@je-mange-africain.com", firstName: "Ange", lastName: "OUIYA", role: "super_admin", status: "active", lastSignInAt: now, createdAt: "2025-08-12T09:00:00.000Z", invitedBy: null, permissions: teamRoleCatalog[0].permissions, current: true, protected: true },
    { id: "member-1", email: "marketing@je-mange-africain.com", firstName: "Mariam", lastName: "Diallo", role: "marketing", status: "active", lastSignInAt: now, createdAt: "2026-03-14T09:00:00.000Z", invitedBy: "direction@je-mange-africain.com", permissions: teamRoleCatalog[1].permissions },
    { id: "member-2", email: "logistique@je-mange-africain.com", firstName: "Idrissa", lastName: "Koné", role: "logistics", status: "active", lastSignInAt: "2026-08-30T14:20:00.000Z", createdAt: "2026-04-05T11:00:00.000Z", invitedBy: "direction@je-mange-africain.com", permissions: teamRoleCatalog[2].permissions },
    { id: "member-3", email: "compta@je-mange-africain.com", firstName: "Awa", lastName: "Traoré", role: "accounting", status: "invited", lastSignInAt: null, createdAt: "2026-09-01T08:00:00.000Z", invitedBy: "direction@je-mange-africain.com", permissions: teamRoleCatalog[3].permissions },
    { id: "member-4", email: "support@je-mange-africain.com", firstName: "Léa", lastName: "Mensah", role: "support", status: "suspended", lastSignInAt: "2026-06-01T10:00:00.000Z", createdAt: "2026-01-18T10:00:00.000Z", invitedBy: "direction@je-mange-africain.com", permissions: teamRoleCatalog[4].permissions },
  ],
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
  let logistics = structuredClone(logisticsPayload);
  let promotions = structuredClone(promotionsPayload.promotions);
  let settingsConfiguration = {
    supportEmail: "bonjour@je-mange-africain.com",
    supportPhone: "+33 1 84 80 20 26",
    supportHoursFr: "Du lundi au vendredi, de 9 h à 18 h",
    supportHoursEn: "Monday to Friday, 9am to 6pm",
    supportResponseHours: 48,
    businessCity: "Paris",
    businessCountry: "France",
  };
  let operationalOrder = {
    ...structuredClone(order),
    notes: null as string | null,
    shipments: order.shipments.map((shipment) => ({
      ...shipment,
      trackingNumber: shipment.trackingNumber as string | null,
      estimatedDelivery: shipment.estimatedDelivery as string | null,
      carrier: shipment.carrier as string | null,
    })),
  };
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    let payload: unknown;

    if (path === "/api/admin/session") payload = { user: { email: "direction@je-mange-africain.com", role: "super_admin" } };
    else if (path === "/api/admin/dashboard") payload = dashboard;
    else if (path === "/api/admin/payments/payment-1/refund" && request.method() === "POST") {
      const body = request.postDataJSON() as { amount: number; reason: string; note: string; requestId: string };
      const refund = { id: body.requestId, amount: body.amount, status: "completed", reason: `${body.reason}:${body.note}`, createdAt: "2026-09-02T10:45:00.000Z" };
      operationalOrder = { ...operationalOrder, refunds: [...operationalOrder.refunds, refund] };
      payload = {
        refund,
        payment: { id: "payment-1", status: "captured", completed: body.amount, pending: 0, committed: body.amount, refundable: 48.7 - body.amount },
        order: { id: operationalOrder.id, status: operationalOrder.status },
      };
    }
    else if (path === "/api/admin/orders/order-1" && request.method() === "PATCH") {
      const body = request.postDataJSON() as {
        status?: string;
        notes?: string;
        shipment?: { id?: string; carrier?: string; trackingNumber?: string; thermalClass?: string; estimatedDelivery?: string; confirmCode?: string; proofPhoto?: string; signature?: string };
      };
      const selectedIndex = body.shipment?.id ? operationalOrder.shipments.findIndex((shipment) => shipment.id === body.shipment?.id) : -1;
      const selectedShipment = selectedIndex >= 0 ? operationalOrder.shipments[selectedIndex] : null;
      const nextShipment = {
        id: selectedShipment?.id || "shipment-2",
        trackingNumber: body.shipment?.trackingNumber || selectedShipment?.trackingNumber || null,
        thermalClass: body.shipment?.thermalClass || selectedShipment?.thermalClass || "AMBIANT",
        status: body.status === "shipped" ? "picked_up" : selectedShipment?.status || "created",
        estimatedDelivery: body.shipment?.estimatedDelivery || selectedShipment?.estimatedDelivery || null,
        carrier: body.shipment?.carrier || selectedShipment?.carrier || null,
      };
      const nextShipments = selectedIndex >= 0
        ? operationalOrder.shipments.map((shipment, index) => index === selectedIndex ? nextShipment : shipment)
        : [...operationalOrder.shipments, nextShipment];
      const nextTimeline = body.status
        ? [...operationalOrder.timeline, { status: body.status, label: body.status === "packed" ? "Colis prêt" : body.status, at: "2026-09-02T10:30:00.000Z", actor: "direction@je-mange-africain.com" }]
        : operationalOrder.timeline;
      operationalOrder = { ...operationalOrder, status: body.status || operationalOrder.status, notes: body.notes || null, shipments: nextShipments, timeline: nextTimeline };
      payload = {
        updatedShipmentId: nextShipment.id,
        order: {
          status: operationalOrder.status,
          notes: operationalOrder.notes,
          shipments: operationalOrder.shipments,
          timeline: nextTimeline,
        },
      };
    }
    else if (path === "/api/admin/promotions" && request.method() === "POST") {
      const body = request.postDataJSON();
      const promotion = { id: `promotion-${promotions.length + 1}`, usedCount: 0, createdAt: now, ...body };
      promotions.push(promotion);
      payload = { promotion };
    }
    else if (path.startsWith("/api/admin/promotions/") && request.method() === "PATCH") {
      const id = path.split("/").at(-1);
      const body = request.postDataJSON();
      promotions = promotions.map((promotion) => promotion.id === id ? { ...promotion, ...body } : promotion);
      payload = { promotion: promotions.find((promotion) => promotion.id === id) };
    }
    else if (path.startsWith("/api/admin/promotions/") && request.method() === "DELETE") {
      const id = path.split("/").at(-1);
      promotions = promotions.filter((promotion) => promotion.id !== id);
      payload = { ok: true };
    }
    else if (path === "/api/admin/promotions") payload = { promotions };
    else if (path === "/api/admin/products") payload = {
      products: [
        { id: "product-1", name: "Attiéké frais", nameFr: "Attiéké frais", nameEn: "Fresh attieke", descriptionFr: "Semoule de manioc fermentée, fraîche et légère.", descriptionEn: "Light, fresh fermented cassava couscous.", traditionalName: "Attiéké", sku: "JMA-ATT-500", categoryId: "cat-1", packaging: "Sachet 500 g", costPrice: 2.8, profitMargin: 2.1, costSource: "recorded", price: 4.9, promoPrice: null, stockQty: 84, reservedQty: 9, availableQty: 75, alertThreshold: 12, netWeightGrams: 500, imageColor: "#E9B949", imageEmoji: "", imageUrl: "/products/attieke.webp", aliases: ["atchéké", "couscous de manioc"], isNew: false, isRecommended: true, isBestseller: true, status: "published", thermalClass: "REFRIGERATED", storageType: "REFRIGERE", country: "Côte d'Ivoire" },
        { id: "product-2", name: "Fonio précuit", nameFr: "Fonio précuit", nameEn: "Pre-cooked fonio", descriptionFr: "Céréale fine et légère prête à cuisiner.", descriptionEn: "A light, fine grain ready to cook.", traditionalName: "Fonio", sku: "JMA-FON-500", categoryId: "cat-2", packaging: "Sachet 500 g", costPrice: 3.1, profitMargin: 1.8, costSource: "recorded", price: 4.9, promoPrice: null, stockQty: 31, reservedQty: 3, availableQty: 28, alertThreshold: 8, netWeightGrams: 500, imageColor: "#D65A32", imageEmoji: "", imageUrl: "/products/fonio.webp", aliases: ["acha"], isNew: true, isRecommended: false, isBestseller: false, status: "published", thermalClass: "AMBIANT", storageType: "SEC", country: "Guinée" },
      ],
      total: 2,
    };
    else if (path === "/api/admin/recipes") payload = {
      recipes: [{ id: "recipe-1", title: "Attiéké poisson braisé", description: "Le grand classique ivoirien, composé avec des produits disponibles.", country: "Côte d'Ivoire", category: "Plats", difficulty: "intermediate", timeMinutes: 55, baseServings: 4, imageColor: "#D65A32", imageEmoji: "", imageUrl: "/recipes/attieke-poisson.webp", isPopular: true, isNew: false, isRecommended: true, status: "published", ingredientCount: 8, requiredIngredientCount: 8, availableIngredientCount: 7, stockCoverageRate: 88, needsAttention: true, stepCount: 5, updatedAt: now }],
    };
    else if (path === "/api/admin/recipes/recipe-1" && request.method() === "PATCH") payload = { recipe: { id: "recipe-1", slug: "attieke-poisson-braise", status: request.postDataJSON().status } };
    else if (path === "/api/admin/recipes/recipe-1") payload = {
      id: "recipe-1",
      title: "Attiéké poisson braisé",
      description: "Le grand classique ivoirien, composé avec des produits disponibles.",
      titleFr: "Attiéké poisson braisé",
      titleEn: "Attieke with grilled fish",
      descriptionFr: "Le grand classique ivoirien, composé avec des produits disponibles.",
      descriptionEn: "An Ivorian classic built with products currently available in stock.",
      country: "Côte d'Ivoire",
      category: "mains",
      difficulty: "medium",
      timeMinutes: 55,
      baseServings: 4,
      imageColor: "#D65A32",
      imageEmoji: "🍲",
      imageUrl: "/recipes/attieke-poisson.webp",
      isPopular: true,
      isNew: false,
      isRecommended: true,
      status: "published",
      steps: ["Assaisonner le poisson.", "Braiser et servir avec l'attiéké."],
      stepsFr: ["Assaisonner soigneusement le poisson.", "Braiser puis servir avec l'attiéké."],
      stepsEn: ["Season the fish thoroughly.", "Grill and serve with the attieke."],
      ingredients: [{ recipeIngredientId: "ingredient-1", productId: "product-1", variantId: null, quantityPerBase: 500, unit: "g", role: "base", optional: false, alternativeProductIds: ["product-2"], note: null, product: { id: "product-1", nameFr: "Attiéké frais", nameEn: "Fresh attieke", stockQty: 84, reservedQty: 9, availableQty: 75, imageUrl: "/products/attieke.webp" } }],
    };
    else if (path === "/api/dishes") payload = dishTemplatePayload;
    else if (path === "/api/admin/payments") payload = paymentLedgerPayload(operationalOrder, new URL(request.url()));
    else if (path === "/api/orders") payload = { orders: [operationalOrder] };
    else if (path === "/api/admin/stock" && request.method() === "POST") payload = { batch: { id: "batch-2", lotNumber: "ATT-2609-FR" } };
    else if (path === "/api/admin/stock/batch-1" && request.method() === "PATCH") {
      const body = request.postDataJSON() as { action: "adjust" | "status"; direction?: "increase" | "decrease"; quantity?: number; status?: string };
      payload = body.action === "adjust"
        ? { batch: { id: "batch-1", quantity: inventoryBatch.quantity + (body.direction === "decrease" ? -(body.quantity || 0) : body.quantity || 0), status: inventoryBatch.status }, movement: { quantity: body.quantity || 0 } }
        : { batch: { id: "batch-1", quantity: inventoryBatch.quantity, status: body.status }, movement: { quantity: -inventoryBatch.quantity } };
    }
    else if (path === "/api/admin/stock") payload = inventoryPayload;
    else if (path === "/api/admin/logistics/zones" && request.method() === "POST") {
      const body = request.postDataJSON();
      const carrier = logistics.carriers.find((item) => item.id === body.carrierId);
      const zone = { id: `zone-${logistics.zones.length + 1}`, carrier: carrier?.name || null, ...body };
      logistics.zones.push(zone);
      logistics.summary.routes = logistics.zones.length;
      logistics.summary.countries = new Set(logistics.zones.map((item) => item.country)).size;
      payload = { zone };
    }
    else if (path.startsWith("/api/admin/logistics/zones/") && request.method() === "PATCH") {
      const id = path.split("/").at(-1);
      const body = request.postDataJSON();
      const carrier = logistics.carriers.find((item) => item.id === body.carrierId);
      logistics.zones = logistics.zones.map((item) => item.id === id ? { ...item, ...body, carrier: carrier?.name || null } : item);
      payload = { zone: logistics.zones.find((item) => item.id === id) };
    }
    else if (path.startsWith("/api/admin/logistics/zones/") && request.method() === "DELETE") {
      const id = path.split("/").at(-1);
      logistics.zones = logistics.zones.filter((item) => item.id !== id);
      logistics.summary.routes = logistics.zones.length;
      payload = { ok: true };
    }
    else if (path === "/api/admin/logistics/carriers" && request.method() === "POST") {
      const body = request.postDataJSON();
      const carrier = { id: `carrier-${logistics.carriers.length + 1}`, shipmentCount: 0, zoneCount: 0, ...body };
      logistics.carriers.push(carrier);
      logistics.summary.carriers = logistics.carriers.length;
      payload = { carrier };
    }
    else if (path.startsWith("/api/admin/logistics/carriers/") && request.method() === "PATCH") {
      const id = path.split("/").at(-1);
      const body = request.postDataJSON();
      logistics.carriers = logistics.carriers.map((item) => item.id === id ? { ...item, ...body } : item);
      payload = { carrier: logistics.carriers.find((item) => item.id === id) };
    }
    else if (path.startsWith("/api/admin/logistics/carriers/") && request.method() === "DELETE") payload = { ok: true };
    else if (path === "/api/admin/logistics") payload = logistics;
    else if (path === "/api/shipping/quote") payload = {
      service: "standard", fee: 8.5, carrier: "Chrono Frais", packages: 1, minDelayHours: 24, maxDelayHours: 48, available: true, unavailableReason: null,
      breakdown: { baseFee: 4.9, weightFee: 1.2, frozenSurcharge: 2.4, serviceAdjustment: 0 },
      options: [
        { service: "standard", fee: 8.5, carrier: "Chrono Frais", packages: 1, minDelayHours: 24, maxDelayHours: 48, available: true, unavailableReason: null, breakdown: { baseFee: 4.9, weightFee: 1.2, frozenSurcharge: 2.4, serviceAdjustment: 0 } },
        { service: "express", fee: 12.9, carrier: "JMA Express", packages: 1, minDelayHours: 12, maxDelayHours: 24, available: true, unavailableReason: null, breakdown: { baseFee: 6.9, weightFee: 1.8, frozenSurcharge: 4.2, serviceAdjustment: 0 } },
        { service: "relay", fee: 0, carrier: "DPD Europe", packages: 1, minDelayHours: 48, maxDelayHours: 72, available: false, unavailableReason: "cold_chain", breakdown: { baseFee: 3.5, weightFee: 0.9, frozenSurcharge: 0, serviceAdjustment: 0 } },
      ],
    };
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
    else if (path === "/api/admin/customers") payload = customerPortfolioPayload;
    else if (path === "/api/admin/push" && request.method() === "POST") payload = { campaign: { id: "push-2" }, delivery: { total: 184, sent: 184, failed: 0, configured: true } };
    else if (path === "/api/admin/push") payload = {
      activeSubscriptions: 1284,
      configured: true,
      audiences: { all: 1284, signed_in: 932, guests: 352, ambassador: 184, active: 516, at_risk: 126, new: 106 },
      recent: [{ id: "push-1", titleFr: "Le marché du week-end", bodyFr: "Votre sélection ivoirienne est disponible.", sent: true, createdAt: now, type: "promotion", url: "/?view=catalog", audience: "all", recipientCount: 1268, deliveredCount: 1249, failedCount: 19 }],
    };
    else if (path === "/api/admin/advertisements") payload = { advertisements: [{ id: "ad-1", placement: "home", titleFr: "Saveurs de Côte d'Ivoire", titleEn: "Flavours of Côte d'Ivoire", bodyFr: "Une sélection prête à cuisiner.", bodyEn: "A selection ready to cook.", imageUrl: "/hero-feast-v2.webp", imageAltFr: "Table de plats ivoiriens", imageAltEn: "Table of Ivorian dishes", linkUrl: "/?view=catalog", status: "published", priority: 1, startsAt: now, endsAt: "2026-09-30T23:59:59.000Z" }] };
    else if (path === "/api/admin/profitability") payload = profitabilityPayload;
    else if (path === "/api/admin/audit") payload = auditPayload;
    else if (path === "/api/admin/settings" && request.method() === "PATCH") {
      settingsConfiguration = request.postDataJSON();
      payload = { configuration: settingsConfiguration, metadata: { persisted: true, updatedBy: "direction@je-mange-africain.com", updatedAt: now }, integrations: [] };
    }
    else if (path === "/api/admin/settings") payload = {
      configuration: settingsConfiguration,
      metadata: { persisted: true, updatedBy: "direction@je-mange-africain.com", updatedAt: now },
      integrations: [
        { id: "database", state: "ready", provider: "PostgreSQL", capabilities: { connection: true, persistence: true, production: true } },
        { id: "payments", state: "partial", provider: "Stripe", capabilities: { connection: true, webhook: false } },
        { id: "identity", state: "ready", provider: "Supabase", capabilities: { connection: true, serverAccess: true } },
        { id: "cache", state: "attention", provider: "Upstash Redis", capabilities: { connection: false } },
        { id: "push", state: "ready", provider: "Web Push", capabilities: { connection: true } },
      ],
    };
    else if (path === "/api/categories") payload = { categories: [{ id: "cat-1", name: "Féculents et farines" }, { id: "cat-2", name: "Épices" }] };
    else if (path === "/api/brands") payload = { brands: [{ id: "brand-1", name: "Je mange Africain" }] };
    else if (path.startsWith("/api/admin/team/") && request.method() === "PATCH") payload = { member: { id: path.split("/").at(-1), ...request.postDataJSON() } };
    else if (path.startsWith("/api/admin/team/") && request.method() === "DELETE") payload = { ok: true };
    else if (path === "/api/admin/team" && request.method() === "POST") payload = { member: { id: "member-new", ...request.postDataJSON(), status: "invited" } };
    else if (path === "/api/admin/team") payload = teamPayload;
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
  { id: "logistics", nav: "Piloter la livraison", title: "Promesse de livraison" },
  { id: "customers", nav: "Développer la relation", title: "Piloter chaque relation" },
  { id: "promotions", nav: "Piloter les promotions", title: "Piloter les promotions" },
  { id: "campaigns", nav: "Diffuser sur mobile", title: "Composer, vérifier, diffuser" },
  { id: "advertising", nav: "Piloter les emplacements", title: "Régie publicitaire" },
  { id: "finance", nav: "Mesurer la rentabilité", title: "Rentabilité et encaissements" },
  { id: "governance", nav: "Auditer l'exploitation", title: "Gouverner sans ambiguïté" },
  { id: "team", nav: "Administrer les habilitations", title: "Équipe professionnelle" },
  { id: "settings", nav: "Configurer la plateforme", title: "Configuration de la plateforme" },
] as const;

test("the professional sign-in owns its bilingual identity and persists the selected language", async ({ page }) => {
  let credentials: { email?: string; password?: string } | undefined;
  await page.route("**/api/admin/session", async (route) => {
    if (route.request().method() === "POST") {
      credentials = route.request().postDataJSON();
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ user: { email: "direction@je-mange-africain.com", role: "super_admin" } }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ user: null }) });
  });
  await page.route("**/api/admin/dashboard?*", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(dashboard) }));

  await page.goto("/admin", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Connexion professionnelle" })).toBeVisible();
  await expect(page.getByTestId("admin-auth-workspace")).toBeVisible();
  const isMobile = (page.viewportSize()?.width || 0) < 768;
  const visual = page.getByTestId("admin-auth-visual");
  if (isMobile) {
    await expect(visual).toBeHidden();
    const mobileLogo = page.getByTestId("admin-auth-workspace").locator('img[src*="logo-mark-burgundy"]');
    await expect(mobileLogo).toBeVisible();
    await expect.poll(() => mobileLogo.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  } else {
    await expect(visual).toBeVisible();
    const visualImage = visual.locator('img[src*="recipe-library-hero"]');
    await expect(visualImage).toBeVisible();
    await expect.poll(() => visualImage.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
    await expect(page.getByTestId("admin-auth-overlay")).toHaveClass(/bg-burgundy\/55/);
    await expect(page.getByTestId("admin-auth-signals")).toContainText("Habilitations");
    await expect(page.getByTestId("admin-auth-signals")).toContainText("Traçabilité");
    await expect(page.getByTestId("admin-auth-signals")).toContainText("Accès protégé");
  }
  await expect(page.locator('img[src*="logo-mark-burgundy"]').filter({ visible: true }).first()).toBeVisible();
  await expect(page).toHaveTitle("Console professionnelle | Je mange Africain");
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await expect(page.locator(".jma-skip-link")).toHaveAttribute("href", "#main-content");
  await expect(page.locator("#main-content")).toBeVisible();
  if (process.env.ADMIN_SCREENSHOTS) {
    await page.screenshot({ path: `output/playwright/audit/admin-auth-${isMobile ? "mobile" : "desktop"}.png`, scale: "css" });
  }
  await page.getByRole("button", { name: "en", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Professional sign in" })).toBeVisible();
  await expect(page.getByText("Professional console", { exact: true }).filter({ visible: true }).first()).toBeVisible();
  await expect(page).toHaveTitle("Professional console | Je mange Africain");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator(".jma-skip-link")).toHaveText("Skip to main content");
  await expect(page.locator("body")).not.toContainText(/my basket|customer sign in|food & groceries/i);
  const loginForm = page.getByRole("form", { name: "Professional sign-in form" });
  const submit = loginForm.getByRole("button", { name: "Open the console" });
  await expect(submit).toBeDisabled();
  await expect(page.getByRole("link", { name: "Return to the store" })).toHaveAttribute("href", "/");
  await expect(page.getByRole("link", { name: "Contact management" })).toHaveAttribute("href", "mailto:direction@je-mange-africain.com");
  await expectBrandSafeUiColors(page);
  const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(accessibility.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious")).toEqual([]);
  if (process.env.ADMIN_SCREENSHOTS) {
    await page.screenshot({ path: `output/playwright/audit/admin-auth-english-${isMobile ? "mobile" : "desktop"}.png`, scale: "css" });
  }

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Professional sign in" })).toBeVisible();
  await expect(page.getByRole("button", { name: "en", exact: true })).toHaveAttribute("aria-pressed", "true");
  const reloadedForm = page.getByRole("form", { name: "Professional sign-in form" });
  await reloadedForm.getByLabel("Professional email address").fill("direction@je-mange-africain.com");
  const password = reloadedForm.locator("#admin-password");
  await password.fill("motdepasse-solide");
  await expect(password).toHaveAttribute("type", "password");
  await reloadedForm.getByRole("button", { name: "Show password" }).click();
  await expect(password).toHaveAttribute("type", "text");
  await expect(reloadedForm.getByRole("button", { name: "Open the console" })).toBeEnabled();
  await reloadedForm.getByRole("button", { name: "Open the console" }).click();
  await expect(page.locator("header h1")).toHaveText("Decide today");
  expect(credentials).toEqual({ email: "direction@je-mange-africain.com", password: "motdepasse-solide" });
  await expect(page.getByTestId("admin-auth-workspace")).toBeHidden();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test("every professional workspace has a clear purpose and stays inside the viewport", async ({ page }) => {
  test.setTimeout(180_000);
  await mockAdminApi(page);
  await page.goto("/admin", { waitUntil: "domcontentloaded" });
  await expect(page.locator("header h1")).toBeVisible();

  const mobile = (page.viewportSize()?.width || 0) < 768;
  if (mobile) await page.getByRole("button", { name: "Ouvrir la navigation" }).click();
  const sidebar = page.getByTestId("admin-sidebar");
  await expect(sidebar).toBeVisible();
  await expect.poll(() => sidebar.evaluate((element) => getComputedStyle(element).backgroundColor)).toBe("rgb(255, 252, 250)");
  if (mobile) await sidebar.getByRole("button", { name: "Fermer la navigation" }).click();
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

test("the adaptive professional navigation distinguishes quick and secondary workspaces", async ({ page }) => {
  await mockAdminApi(page);
  await page.goto("/admin#overview", { waitUntil: "domcontentloaded" });
  const mobile = (page.viewportSize()?.width || 0) < 768;
  const sidebar = page.getByTestId("admin-sidebar");

  if (mobile) {
    const quickNavigation = page.getByTestId("admin-mobile-navigation");
    await expect(quickNavigation).toBeVisible();
    const quickButtons = quickNavigation.locator(":scope > button");
    await expect(quickButtons).toHaveCount(5);
    const targets = await quickButtons.evaluateAll((buttons) => buttons.map((button) => {
      const box = button.getBoundingClientRect();
      return { width: box.width, height: box.height };
    }));
    expect(targets.every(({ width, height }) => width >= 44 && height >= 44)).toBe(true);
    await expect(quickNavigation.locator('button[aria-current="page"]')).toHaveCount(1);
    await expect(quickNavigation.getByRole("button", { name: "Cockpit" })).toHaveAttribute("data-active", "true");

    const more = page.getByTestId("admin-mobile-more");
    await more.click();
    await expect(sidebar).toBeVisible();
    await expect(more).toHaveAttribute("aria-expanded", "true");
    await page.getByRole("navigation", { name: "Navigation professionnelle" }).getByRole("button", { name: /^Mesurer la rentabilité/ }).click();
    await expect(page.locator("header h1")).toHaveText("Mesurer la rentabilité");
    await expect(page.locator("main").getByRole("heading", { name: "Rentabilité et encaissements" })).toBeVisible();
    await expect(more).toHaveAttribute("data-active", "true");
    await expect(quickNavigation.locator('button[aria-current="page"]')).toHaveCount(0);
    if (process.env.ADMIN_SCREENSHOTS) {
      const directory = join(process.cwd(), "output", "playwright", "admin-review");
      mkdirSync(directory, { recursive: true });
      await page.screenshot({ path: join(directory, "admin-shell-secondary-mobile.png"), scale: "css" });
    }

    await page.getByRole("button", { name: "Ouvrir la navigation" }).click();
    await expect(page.getByRole("navigation", { name: "Navigation professionnelle" }).locator('button[aria-current="page"]')).toContainText("Mesurer la rentabilité");
  } else {
    await expect(sidebar).toBeVisible();
    const professionalNavigation = page.getByRole("navigation", { name: "Navigation professionnelle" });
    await expect(professionalNavigation.locator('button[aria-current="page"]')).toHaveCount(1);
    await professionalNavigation.getByRole("button", { name: /^Mesurer la rentabilité/ }).click();
    const financeItem = professionalNavigation.getByRole("button", { name: /^Mesurer la rentabilité/ });
    await expect(page.locator("main").getByRole("heading", { name: "Rentabilité et encaissements" })).toBeVisible();
    await expect(financeItem).toHaveAttribute("aria-current", "page");
    await expect(financeItem).toHaveAttribute("data-active", "true");
    await expect(financeItem).toContainText("Coûts bruts, marges et ventes par famille");
    await expect(page.getByTestId("admin-mobile-navigation")).toBeHidden();
    if (process.env.ADMIN_SCREENSHOTS) {
      const directory = join(process.cwd(), "output", "playwright", "admin-review");
      mkdirSync(directory, { recursive: true });
      await page.screenshot({ path: join(directory, "admin-shell-sidebar-desktop.png"), scale: "css" });
    }
  }

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(accessibility.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious")).toEqual([]);
  await expectBrandSafeUiColors(page);
});

test("the promotion desk schedules a targeted benefit and confirms immediate suspension", async ({ page }) => {
  const mutations: Array<{ method: string; path: string; body: Record<string, unknown> }> = [];
  page.on("request", (request) => {
    const path = new URL(request.url()).pathname;
    if (path.startsWith("/api/admin/promotions") && request.method() !== "GET") {
      mutations.push({ method: request.method(), path, body: request.postDataJSON() || {} });
    }
  });
  await mockAdminApi(page);
  await page.goto("/admin#promotions", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "Piloter les promotions" })).toBeVisible();
  await expect(page.getByTestId("promotion-metrics")).toContainText("actives");
  await expect(page.getByTestId("promotion-register")).toContainText("BIENVENUE10");
  await expect(page.getByTestId("promotion-register")).toContainText("FR-LIVRAISON");
  await expect(page.getByText("Planifiée", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Nouvelle promotion" }).click();
  const editor = page.getByRole("dialog", { name: "Composer une promotion" });
  await editor.getByRole("textbox", { name: "Code promotionnel" }).fill("EPICES15");
  await editor.getByRole("button", { name: "Pourcentage" }).click();
  await editor.getByLabel("Pourcentage (%)").fill("15");
  await editor.getByLabel("Panier minimum (€)").fill("40");
  await editor.getByLabel("Périmètre").selectOption("category");
  await editor.getByLabel("Famille ciblée").selectOption("cat-2");
  await editor.getByLabel("Quota d'utilisations").fill("250");
  await expect(editor).toContainText("Reflet du panier client");
  await expect(editor).toContainText("EPICES15");
  await expect(editor).toContainText("9,00 € de remise");
  const dialogOverflow = await editor.evaluate((element) => element.scrollWidth - element.clientWidth);
  expect(dialogOverflow).toBeLessThanOrEqual(1);
  const editorAccessibility = await new AxeBuilder({ page }).include('[data-testid="promotion-editor"]').withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(editorAccessibility.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious")).toEqual([]);
  await editor.getByRole("button", { name: "Enregistrer" }).click();

  await expect(editor).toBeHidden();
  await expect.poll(() => mutations.filter((item) => item.method === "POST").length).toBe(1);
  expect(mutations.find((item) => item.method === "POST")?.body).toMatchObject({ code: "EPICES15", type: "percent", value: 15, minOrder: 40, appliesTo: "category", targetId: "cat-2", usageLimit: 250, active: true });
  await expect(page.getByTestId("promotion-register")).toContainText("EPICES15");

  await page.getByRole("button", { name: "Suspendre BIENVENUE10" }).click();
  const suspension = page.getByRole("alertdialog", { name: "Suspendre immédiatement cette promotion ?" });
  await expect(suspension).toContainText("refusé dans le panier et au paiement");
  await expect.poll(() => mutations.filter((item) => item.method === "PATCH").length).toBe(0);
  await suspension.getByRole("button", { name: "Oui, suspendre" }).click();
  await expect(suspension).toBeHidden();
  await expect.poll(() => mutations.filter((item) => item.method === "PATCH").length).toBe(1);
  expect(mutations.find((item) => item.method === "PATCH")?.body).toMatchObject({ code: "BIENVENUE10", active: false });

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await expectBrandSafeUiColors(page);
  if (process.env.ADMIN_SCREENSHOTS) {
    const directory = join(process.cwd(), "output", "playwright", "admin-review");
    mkdirSync(directory, { recursive: true });
    await page.screenshot({ path: join(directory, `promotions-${(page.viewportSize()?.width || 0) < 768 ? "mobile" : "desktop"}.png`), fullPage: true });
  }
});

test("the logistics cockpit publishes a route and mirrors the customer delivery promise", async ({ page }) => {
  const logisticsMutations: Array<{ method: string; path: string; body: Record<string, unknown> }> = [];
  page.on("request", (request) => {
    const path = new URL(request.url()).pathname;
    if (path.startsWith("/api/admin/logistics/") && request.method() !== "GET") {
      logisticsMutations.push({ method: request.method(), path, body: request.postDataJSON() || {} });
    }
  });
  await mockAdminApi(page);
  await page.goto("/admin#logistics", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "Promesse de livraison" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Routes proposées au paiement" })).toBeVisible();
  await expect(page.getByTestId("delivery-route-list")).toContainText("Chrono Frais");
  await expect(page.getByText("3", { exact: true }).filter({ visible: true }).first()).toBeVisible();

  await page.getByRole("button", { name: "Nouvelle route" }).click();
  const routeDialog = page.getByRole("dialog", { name: "Nouvelle zone tarifaire" });
  const routeForm = routeDialog.getByRole("form", { name: "Formulaire de zone tarifaire" });
  await routeForm.getByLabel("Pays").selectOption("Belgique");
  await routeForm.getByLabel("Transporteur").selectOption("carrier-jma");
  await routeForm.getByLabel("Service client").selectOption("express");
  await routeForm.getByLabel("Forfait de base (€)").fill("7.50");
  await routeForm.getByLabel("Prix par kg (€)").fill("0.90");
  await routeForm.getByLabel("Surcharge surgelée (€)").fill("3.20");
  await routeForm.getByLabel("Délai maximal (heures)").fill("18");
  await routeForm.getByRole("button", { name: "Enregistrer la route" }).click();

  await expect(routeDialog).toBeHidden();
  await expect(page.getByRole("status")).toContainText("prochain calcul client");
  await expect(page.getByTestId("delivery-route-list")).toContainText("Belgique");
  await expect.poll(() => logisticsMutations.length).toBe(1);
  expect(logisticsMutations[0]).toMatchObject({
    method: "POST",
    path: "/api/admin/logistics/zones",
    body: { country: "Belgique", carrierId: "carrier-jma", service: "express", baseFee: 7.5, minDelayHours: 18 },
  });

  await page.getByRole("button", { name: "Supprimer Belgique" }).click();
  const deletion = page.getByRole("alertdialog", { name: "Supprimer cette route ?" });
  await expect(deletion).toContainText("commandes existantes conserveront leur transporteur");
  await expect.poll(() => logisticsMutations.length).toBe(1);
  await deletion.getByRole("button", { name: "Annuler" }).click();

  await page.getByRole("tab", { name: /Simulateur client/ }).click();
  const simulator = page.getByRole("form", { name: "Simulateur de livraison" });
  await simulator.getByLabel("Contrainte thermique").selectOption("FROZEN");
  await simulator.getByLabel("Poids du panier (kg)").fill("4.2");
  await simulator.getByRole("button", { name: "Calculer les 3 options" }).click();
  const results = page.getByTestId("shipping-simulation-results");
  await expect(results).toContainText("Chrono Frais");
  await expect(results).toContainText("JMA Express");
  await expect(results).toContainText("Indisponible avec cette contrainte thermique");
  await expect(results.locator("article")).toHaveCount(3);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(accessibility.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious")).toEqual([]);
  await expectBrandSafeUiColors(page);

  if (process.env.ADMIN_SCREENSHOTS) {
    const directory = join(process.cwd(), "output", "playwright", "admin-review");
    mkdirSync(directory, { recursive: true });
    await page.screenshot({ path: join(directory, `logistics-simulator-${(page.viewportSize()?.width || 0) < 768 ? "mobile" : "desktop"}.png`), fullPage: false });
  }
});

test("platform settings publish durable customer-facing contact details", async ({ page }) => {
  await mockAdminApi(page);
  await page.goto("/admin#settings", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "Configuration de la plateforme" })).toBeVisible();
  await expect(page.getByTestId("production-readiness")).toContainText("Mise en production à finaliser");
  await expect(page.getByTestId("production-readiness")).toContainText("78 %");
  await expect(page.getByTestId("integration-database")).toContainText("Base de production");
  await expect(page.getByTestId("integration-payments")).toContainText("Confirmation serveur");
  const form = page.getByRole("form", { name: "Coordonnées publiques de service" });
  await form.getByLabel("E-mail d'assistance").fill("service-client@je-mange-africain.com");
  await form.getByLabel("Délai indicatif (heures)").fill("24");
  await form.getByRole("button", { name: "Publier les coordonnées" }).click();

  await expect(form.getByRole("status")).toContainText("Configuration enregistrée");
  await expect(page.getByText("service-client@je-mange-africain.com", { exact: true })).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Ce que la boutique affiche" })).toContainText("Réponse sous 24 h");

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByLabel("E-mail d'assistance")).toHaveValue("service-client@je-mange-africain.com");
  await expect(page.getByLabel("Délai indicatif (heures)")).toHaveValue("24");

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(accessibility.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious")).toEqual([]);

  if (process.env.ADMIN_SCREENSHOTS) {
    const directory = join(process.cwd(), "output", "playwright", "admin-review");
    mkdirSync(directory, { recursive: true });
    await page.screenshot({ path: join(directory, `platform-readiness-${(page.viewportSize()?.width || 0) < 768 ? "mobile" : "desktop"}.png`), fullPage: true });
  }
});

test("the operations home turns live signals into clear decisions", async ({ page }) => {
  await mockAdminApi(page);
  await page.goto("/admin#overview", { waitUntil: "domcontentloaded" });
  const mobile = (page.viewportSize()?.width || 0) < 768;

  await expect(page.getByRole("heading", { name: "Sept jours d'encaissement" })).toBeVisible();
  await expect(page.getByTestId("dashboard-pulse-bar")).toHaveCount(7);
  await expect(page.getByText("97,4 %", { exact: true })).toBeVisible();
  await expect(page.getByText("+12,4 %", { exact: true })).toBeVisible();
  const storefrontMirror = page.getByTestId("storefront-mirror");
  await expect(storefrontMirror.getByRole("heading", { name: "Ce que la boutique montre maintenant" })).toBeVisible();
  await expect(storefrontMirror.getByRole("button", { name: "Produits achetables: 76/78" })).toBeVisible();
  await expect(storefrontMirror.getByRole("button", { name: "Recettes composables: 22/24" })).toBeVisible();
  await expect(storefrontMirror.getByRole("button", { name: "Avantages actifs: 3" })).toBeVisible();
  await expect(storefrontMirror.getByRole("button", { name: "Campagnes visibles: 4" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Décisions à prendre maintenant" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Livraisons hors délai/ })).toContainText("2");
  await expect(page.getByText("JMA-260902-0142", { exact: true })).toBeVisible();
  await expect(page.getByText("Attiéké frais", { exact: true })).toBeVisible();
  await expect(page.locator('img[src*="attieke"]').filter({ visible: true }).first()).toBeVisible();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious")).toEqual([]);
  await expectBrandSafeUiColors(page);

  if (process.env.ADMIN_SCREENSHOTS) {
    const directory = join(process.cwd(), "output", "playwright", "admin-review");
    mkdirSync(directory, { recursive: true });
    await page.screenshot({ path: join(directory, `overview-command-${(page.viewportSize()?.width || 0) < 768 ? "mobile" : "desktop"}.png`), fullPage: true });
  }

  const mirrorDestinations = [
    { button: "Produits achetables: 76/78", heading: "Produits vendus" },
    { button: "Recettes composables: 22/24", heading: "Recettes achetables" },
    { button: "Avantages actifs: 3", heading: "Piloter les promotions" },
    { button: "Campagnes visibles: 4", heading: "Piloter les emplacements" },
  ];
  for (const destination of mirrorDestinations) {
    await page.getByTestId("storefront-mirror").getByRole("button", { name: destination.button }).click();
    await expect(page.locator("header h1")).toHaveText(destination.heading);
    if (mobile) await page.getByRole("button", { name: "Ouvrir la navigation" }).click();
    await page.getByRole("navigation", { name: "Navigation professionnelle" }).getByRole("button", { name: /^Décider aujourd'hui/ }).click();
    await expect(page.getByTestId("storefront-mirror")).toBeVisible();
  }

  await page.getByRole("button", { name: /Livraisons hors délai/ }).click();
  await expect(page.locator("header h1")).toHaveText("Orchestrer les commandes");

  if (mobile) await page.getByRole("button", { name: "Ouvrir la navigation" }).click();
  await page.getByRole("navigation", { name: "Navigation professionnelle" }).getByRole("button", { name: /^Décider aujourd'hui/ }).click();
  if (mobile) await page.getByRole("button", { name: "Ouvrir la navigation" }).click();
  await page.getByRole("button", { name: "en", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Seven days of collected revenue" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Most purchased products" })).toBeVisible();
  await expect(page.getByText("Available catalogue", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "What the storefront shows now" })).toBeVisible();
});

test("the audit center qualifies, filters and exports operational evidence", async ({ page }) => {
  await mockAdminApi(page);
  let referenceRequests = 0;
  const requestedReferencePaths = new Set<string>();
  page.on("request", (request) => {
    const path = new URL(request.url()).pathname;
    if (path === "/api/categories" || path === "/api/brands") {
      referenceRequests += 1;
      requestedReferencePaths.add(path);
    }
  });

  await page.goto("/admin#governance", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Acteurs, actions et preuves", { exact: true })).toBeVisible();
  await expect(page.getByText("Pays, marques et catégories", { exact: true })).toBeVisible();
  await expect(page.getByText("Complétude moyenne", { exact: true })).toBeVisible();
  await expect(page.getByText("86,7 %", { exact: true })).toBeVisible();
  await expect(page.getByText(/2 actions sensibles figurent/)).toBeVisible();
  expect(referenceRequests).toBe(0);

  await page.getByLabel("Niveau de risque").selectOption("critical");
  await expect(page.getByText("Suppression d'un accès", { exact: true })).toBeVisible();
  await expect(page.getByText("Décision sanitaire", { exact: true })).toBeVisible();
  await expect(page.getByText("Modification de prix", { exact: true })).toBeHidden();

  const search = page.getByRole("searchbox", { name: "Rechercher dans le journal" });
  await search.fill("ATT-2608-FR");
  await expect(page.getByTestId("admin-search-field")).toContainText("1 résultat sur 3");
  await page.getByRole("button", { name: /Décision sanitaire/ }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Décision sanitaire" })).toBeVisible();
  await expect(dialog).toContainText("Identité liée");
  await expect(dialog).toContainText("192.0.2.18");
  await expect(dialog).toContainText("Avant et après");
  await expect(dialog).toContainText("active");
  await expect(dialog).toContainText("recalled");

  if (process.env.ADMIN_SCREENSHOTS) {
    const directory = join(process.cwd(), "output", "playwright", "admin-review");
    mkdirSync(directory, { recursive: true });
    await page.screenshot({ path: join(directory, `governance-evidence-${(page.viewportSize()?.width || 0) < 768 ? "mobile" : "desktop"}.png`), fullPage: false });
  }

  await page.getByRole("button", { name: "Fermer" }).click();
  await page.getByRole("button", { name: "Réinitialiser" }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exporter la vue" }).click();
  expect((await download).suggestedFilename()).toBe("je-mange-africain-journal-audit.csv");

  await page.getByRole("tab", { name: "Référentiels" }).click();
  await expect(page.getByRole("heading", { name: "Référentiels publiés" })).toBeVisible();
  await expect(page.getByText("Féculents et farines · Épices", { exact: true })).toBeVisible();
  await expect.poll(() => requestedReferencePaths.size).toBe(2);
  expect(referenceRequests).toBeGreaterThanOrEqual(2);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious")).toEqual([]);
  await expectBrandSafeUiColors(page);
});

test("the team cockpit grants least-privilege access and documents sensitive decisions", async ({ page }) => {
  test.setTimeout(150_000);
  const mutations: Array<{ method: string; path: string; body: Record<string, unknown> }> = [];
  page.on("request", (request) => {
    const path = new URL(request.url()).pathname;
    if (path.startsWith("/api/admin/team") && request.method() !== "GET") mutations.push({ method: request.method(), path, body: request.postDataJSON() || {} });
  });
  await mockAdminApi(page);
  await page.goto("/admin#team", { waitUntil: "domcontentloaded" });

  await expect(page.getByText("Inviter, suspendre et suivre", { exact: true })).toBeVisible();
  await expect(page.getByText("Comparer chaque autorisation", { exact: true })).toBeVisible();
  await expect(page.getByText("Couverture déléguée", { exact: true })).toBeVisible();
  await expect(page.getByText("6/12", { exact: true })).toBeVisible();
  await expect(page.getByText(/1 invitation en attente · 1 compte suspendu/)).toBeVisible();

  await page.getByRole("button", { name: "Inviter un membre" }).click();
  const inviteDialog = page.getByRole("dialog", { name: "Créer un accès professionnel" });
  const inviteAction = inviteDialog.getByRole("button", { name: "Envoyer l'invitation" });
  await expect(inviteAction).toBeDisabled();
  await inviteDialog.getByLabel("Prénom").fill("Fatou");
  await inviteDialog.getByRole("textbox", { name: "Nom", exact: true }).fill("Ndiaye");
  await inviteDialog.getByLabel("E-mail").fill("fatou@je-mange-africain.com");
  await inviteDialog.getByLabel("Rôle attribué").selectOption("catalog_manager");
  await expect(inviteDialog.getByRole("heading", { name: "Responsable catalogue" })).toBeVisible();
  await expect(inviteDialog.getByText("Supprimer", { exact: true })).toBeVisible();
  await expect(inviteAction).toBeEnabled();
  await inviteDialog.getByRole("button", { name: "Fermer" }).click();
  const inviteDiscard = page.getByRole("alertdialog", { name: "Abandonner cette invitation ?" });
  await expect(inviteDiscard).toBeVisible();
  await expect(inviteDiscard).toContainText("Aucun accès professionnel ne sera créé");
  await expect.poll(() => mutations.filter((item) => item.method === "POST").length).toBe(0);
  if (process.env.ADMIN_SCREENSHOTS) {
    const directory = join(process.cwd(), "output", "playwright", "admin-review");
    mkdirSync(directory, { recursive: true });
    await page.screenshot({ path: join(directory, `team-invite-discard-${(page.viewportSize()?.width || 0) < 768 ? "mobile" : "desktop"}.png`), fullPage: false });
  }
  await inviteDiscard.getByRole("button", { name: "Continuer l'invitation" }).click();
  await expect(inviteDialog.getByLabel("Prénom")).toHaveValue("Fatou");
  await expect(inviteDialog.getByLabel("E-mail")).toHaveValue("fatou@je-mange-africain.com");
  await expect(inviteDialog.getByLabel("Rôle attribué")).toHaveValue("catalog_manager");
  if (process.env.ADMIN_SCREENSHOTS) {
    const directory = join(process.cwd(), "output", "playwright", "admin-review");
    mkdirSync(directory, { recursive: true });
    await page.screenshot({ path: join(directory, `team-invite-${(page.viewportSize()?.width || 0) < 768 ? "mobile" : "desktop"}.png`), fullPage: false });
  }
  await inviteAction.click();
  const inviteConfirmation = page.getByRole("alertdialog", { name: "Confirmer cette invitation ?" });
  await expect(inviteConfirmation).toBeVisible();
  await expect(inviteConfirmation).toContainText("fatou@je-mange-africain.com");
  await expect(inviteConfirmation).toContainText("Responsable catalogue");
  await expect.poll(() => mutations.filter((item) => item.method === "POST").length).toBe(0);
  const inviteConfirmationAccessibility = await new AxeBuilder({ page }).include('[role="alertdialog"]').withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(inviteConfirmationAccessibility.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious")).toEqual([]);
  if (process.env.ADMIN_SCREENSHOTS) {
    const directory = join(process.cwd(), "output", "playwright", "admin-review");
    await page.screenshot({ path: join(directory, `team-invite-confirmation-${(page.viewportSize()?.width || 0) < 768 ? "mobile" : "desktop"}.png`), fullPage: false });
  }
  await inviteConfirmation.getByRole("button", { name: "Confirmer l'invitation" }).click();
  await expect(inviteDialog).toBeHidden();
  await expect.poll(() => mutations.filter((item) => item.method === "POST").length).toBe(1);
  expect(mutations.find((item) => item.method === "POST")?.body).toMatchObject({ email: "fatou@je-mange-africain.com", firstName: "Fatou", lastName: "Ndiaye", role: "catalog_manager" });

  const search = page.getByRole("searchbox", { name: "Rechercher un membre" });
  await search.fill("Idrissa");
  await expect(page.getByTestId("admin-search-field")).toContainText("1 résultat sur 5");
  await page.getByRole("button", { name: "Gérer les accès de Idrissa Koné" }).click();
  const accessDialog = page.getByRole("dialog", { name: "Idrissa Koné" });
  await expect(accessDialog).toContainText("Logistique");
  await expect(accessDialog).toContainText("direction@je-mange-africain.com");
  await accessDialog.getByLabel("Nouveau rôle").selectOption("support");
  await accessDialog.getByLabel("Motif obligatoire").fill("Renfort temporaire du service client");
  await expect(accessDialog.getByText("Relation client", { exact: true }).filter({ visible: true }).first()).toBeVisible();
  await accessDialog.getByRole("button", { name: "Fermer", exact: true }).last().click();
  const accessDiscard = page.getByRole("alertdialog", { name: "Abandonner ces modifications ?" });
  await expect(accessDiscard).toBeVisible();
  await expect(accessDiscard).toContainText("Les autorisations, l'état et le compte");
  await expect.poll(() => mutations.filter((item) => item.method === "PATCH").length).toBe(0);
  await accessDiscard.getByRole("button", { name: "Continuer la modification" }).click();
  await expect(accessDialog.getByLabel("Nouveau rôle")).toHaveValue("support");
  await expect(accessDialog.getByLabel("Motif obligatoire")).toHaveValue("Renfort temporaire du service client");

  if (process.env.ADMIN_SCREENSHOTS) {
    const directory = join(process.cwd(), "output", "playwright", "admin-review");
    mkdirSync(directory, { recursive: true });
    await page.screenshot({ path: join(directory, `team-access-${(page.viewportSize()?.width || 0) < 768 ? "mobile" : "desktop"}.png`), fullPage: false });
  }

  await accessDialog.getByRole("button", { name: "Enregistrer le nouveau rôle" }).click();
  const roleConfirmation = page.getByRole("alertdialog", { name: "Confirmer ce changement de rôle ?" });
  await expect(roleConfirmation).toBeVisible();
  await expect(roleConfirmation).toContainText("Logistique");
  await expect(roleConfirmation).toContainText("Relation client");
  await expect(roleConfirmation).toContainText("journal d'audit");
  await expect.poll(() => mutations.filter((item) => item.method === "PATCH").length).toBe(0);
  if (process.env.ADMIN_SCREENSHOTS) {
    const directory = join(process.cwd(), "output", "playwright", "admin-review");
    await page.screenshot({ path: join(directory, `team-role-confirmation-${(page.viewportSize()?.width || 0) < 768 ? "mobile" : "desktop"}.png`), fullPage: false });
  }
  await roleConfirmation.getByRole("button", { name: "Confirmer le nouveau rôle" }).click();
  await expect(accessDialog).toBeHidden();
  await expect.poll(() => mutations.filter((item) => item.method === "PATCH").length).toBe(1);
  expect(mutations.find((item) => item.method === "PATCH")?.body).toMatchObject({ role: "support", status: "active", reason: "Renfort temporaire du service client" });

  await page.getByRole("button", { name: "Réinitialiser" }).click();
  await page.getByRole("button", { name: "Gérer les accès de Mariam Diallo" }).click();
  const mariamDialog = page.getByRole("dialog", { name: "Mariam Diallo" });
  await mariamDialog.getByRole("button", { name: "Suspendre le compte" }).click();
  const suspension = page.getByRole("alertdialog", { name: "Suspendre immédiatement cet accès ?" });
  await suspension.getByLabel("Motif obligatoire").fill("Revue de sécurité du compte");
  await suspension.getByRole("button", { name: "Confirmer la décision" }).click();
  await expect.poll(() => mutations.filter((item) => item.method === "PATCH").length).toBe(2);
  expect(mutations.filter((item) => item.method === "PATCH")[1].body).toMatchObject({ role: "marketing", status: "suspended", reason: "Revue de sécurité du compte" });

  await page.getByRole("button", { name: "Gérer les accès de Ange OUIYA" }).click();
  const protectedDialog = page.getByRole("dialog", { name: "Ange OUIYA" });
  await expect(protectedDialog.getByRole("heading", { name: "Compte de gouvernance protégé" })).toBeVisible();
  await expect(protectedDialog.getByRole("button", { name: "Suspendre le compte" })).toHaveCount(0);
  await protectedDialog.getByRole("button", { name: "Fermer", exact: true }).last().click();

  await page.getByRole("button", { name: "Gérer les accès de Awa Traoré" }).click();
  const awaDialog = page.getByRole("dialog", { name: "Awa Traoré" });
  await awaDialog.getByRole("button", { name: "Supprimer l'accès" }).click();
  const deletion = page.getByRole("alertdialog", { name: "Supprimer ce compte professionnel ?" });
  await deletion.getByLabel("Motif obligatoire").fill("Invitation créée pour le mauvais compte");
  await deletion.getByRole("button", { name: "Supprimer définitivement" }).click();
  await expect.poll(() => mutations.filter((item) => item.method === "DELETE").length).toBe(1);
  expect(mutations.find((item) => item.method === "DELETE")?.body).toMatchObject({ reason: "Invitation créée pour le mauvais compte" });

  await page.getByRole("tab", { name: /Matrice des rôles/ }).click();
  const mobileRoleSelect = page.getByLabel("Rôle à inspecter");
  if (await mobileRoleSelect.isVisible()) await mobileRoleSelect.selectOption("accounting");
  else await page.getByRole("button", { name: /Comptabilité/ }).click();
  await expect(page.getByRole("heading", { name: "Comptabilité" })).toBeVisible();
  await expect(page.getByText("Accès effectifs par espace")).toBeVisible();
  await expect(page.getByText("Aucun accès").first()).toBeVisible();
  await expect(page.getByText("Modifier", { exact: true })).toBeVisible();

  if (process.env.ADMIN_SCREENSHOTS) {
    const directory = join(process.cwd(), "output", "playwright", "admin-review");
    mkdirSync(directory, { recursive: true });
    await page.screenshot({ path: join(directory, `team-matrix-${(page.viewportSize()?.width || 0) < 768 ? "mobile" : "desktop"}.png`), fullPage: false });
  }

  await page.getByRole("tab", { name: /Identités/ }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exporter" }).click();
  expect((await download).suggestedFilename()).toBe("je-mange-africain-equipe.csv");

  await page.evaluate(() => localStorage.setItem("jma-admin-locale", "en"));
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Professional team" })).toBeVisible();
  await expect(page.getByText("Delegated coverage", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: /Role matrix/ }).click();
  await expect(page.getByText("Effective access by workspace")).toBeVisible();
  await expect(page.getByText("Anything not shown is denied.")).toBeVisible();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious")).toEqual([]);
  await expectBrandSafeUiColors(page);
});

test("admin searches report, filter and clear results consistently", async ({ page }) => {
  await mockAdminApi(page);
  const cases = [
    { hash: "catalog", heading: "Ce qui est réellement vendu", label: "Rechercher un produit", visible: "Attiéké frais", total: 2 },
    { hash: "recipes", heading: "Construire des recettes achetables", label: "Rechercher une recette", visible: "Attiéké poisson braisé", total: 1 },
    { hash: "orders", heading: "Du paiement jusqu'à la porte", label: "Rechercher une commande", visible: "JMA-260902-0142", total: 1 },
    { hash: "inventory", heading: "Inventaire piloté par les lots", label: "Rechercher un lot", visible: "ATT-2608-FR", total: 1 },
    { hash: "customers", heading: "Piloter chaque relation", label: "Rechercher un client", visible: "Aminata Koné", total: 6 },
  ] as const;

  for (const item of cases) {
    await page.goto(`/admin#${item.hash}`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: item.heading })).toBeVisible();
    const field = page.getByRole("searchbox", { name: item.label });
    await field.fill("aucun-résultat");
    await expect(page.getByTestId("admin-search-field")).toContainText(`0 résultats sur ${item.total}`);
    await page.getByRole("button", { name: "Effacer la recherche" }).click();
    await expect(field).toHaveValue("");
    await expect(page.getByText(item.visible, { exact: false }).filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByTestId("admin-search-field")).toContainText(`${item.total} résultat${item.total === 1 ? "" : "s"} sur ${item.total}`);
  }

  await page.goto("/admin#finance", { waitUntil: "domcontentloaded" });
  await page.getByRole("tab", { name: /Encaissements/ }).click();
  const paymentSearch = page.getByRole("searchbox", { name: "Rechercher un encaissement" });
  await paymentSearch.fill("introuvable");
  await expect(page.getByTestId("admin-search-field")).toContainText("0 résultats sur 3");
  await page.getByRole("button", { name: "Effacer la recherche" }).click();
  await expect(paymentSearch).toHaveValue("");
  await expect(page.getByText("pi_jma_260902", { exact: true }).filter({ visible: true }).first()).toBeVisible();

  await page.goto("/admin#orders", { waitUntil: "domcontentloaded" });
  await page.getByTestId("admin-order-card-order-1").click();
  const orderDialog = page.getByRole("dialog", { name: /JMA-260902-0142/ });
  await expect(orderDialog.getByText("Carte bancaire", { exact: true })).toBeVisible();
  await expect(orderDialog.getByText("Apple Pay", { exact: true })).toBeVisible();
  await expect(orderDialog.getByText("PayPal", { exact: true })).toBeVisible();
  await expect(orderDialog).toContainText("Capturé");
  await expect(orderDialog).toContainText("En attente");
  await expect(orderDialog).toContainText("Échoué");
  await expect(orderDialog).not.toContainText("apple_pay");
});

test("the finance cockpit explains margin, exports records and leads to action", async ({ page }) => {
  test.setTimeout(120_000);
  await mockAdminApi(page);
  await page.goto("/admin#finance", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "Rentabilité et encaissements" })).toBeVisible();
  await expect(page.getByText("Coûts, marges et décisions", { exact: true })).toBeVisible();
  await expect(page.getByText("Transactions et rapprochements", { exact: true })).toBeVisible();
  const profitabilityTab = page.getByRole("tab", { name: "Rentabilité" });
  const paymentsTab = page.getByRole("tab", { name: "Encaissements" });
  await profitabilityTab.focus();
  await profitabilityTab.press("ArrowRight");
  await expect(paymentsTab).toHaveAttribute("aria-selected", "true");
  await paymentsTab.press("ArrowLeft");
  await expect(profitabilityTab).toHaveAttribute("aria-selected", "true");
  await expect(page.getByTestId("profitability-bridge")).toContainText("Chaque euro de vente expliqué");
  await expect(page.getByTestId("profitability-bridge")).toContainText("86,4 %");
  await expect(page.getByRole("heading", { name: "Produits qui entraînent la demande" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Décisions suggérées" })).toBeVisible();
  await expect(page.getByText("4 unités disponibles pour un seuil de 12.")).toBeVisible();
  const attiekeImage = page.getByRole("img", { name: "Attiéké frais" });
  await expect(attiekeImage).toBeVisible();
  await expect.poll(() => attiekeImage.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
  if (process.env.ADMIN_SCREENSHOTS) {
    const directory = join(process.cwd(), "output", "playwright", "admin-review");
    mkdirSync(directory, { recursive: true });
    await page.getByRole("heading", { name: "Produits qui entraînent la demande" }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: join(directory, `finance-decisions-${(page.viewportSize()?.width || 0) < 768 ? "mobile" : "desktop"}.png`), fullPage: false });
  }

  await page.getByRole("tab", { name: "30 jours" }).click();
  await expect(page.getByText("+12,4 %")).toBeVisible();
  const profitabilityDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exporter" }).click();
  expect((await profitabilityDownload).suggestedFilename()).toBe("je-mange-africain-rentabilite-general.csv");

  await page.getByRole("tab", { name: /Familles/ }).click();
  await expect(page.getByText("Épices et condiments").filter({ visible: true }).first()).toBeVisible();
  await page.getByRole("tab", { name: /Lots/ }).click();
  await expect(page.getByText("AKP-2608-CI").filter({ visible: true }).first()).toBeVisible();
  await page.getByRole("tab", { name: /Décisions/ }).click();
  await page.getByRole("button", { name: "Ouvrir les lots" }).click();
  await expect(page.getByRole("heading", { name: "Inventaire piloté par les lots" })).toBeVisible();

  await page.goto("/admin#finance", { waitUntil: "domcontentloaded" });
  await page.getByRole("tab", { name: "Encaissements" }).click();
  await expect(page.getByTestId("payment-ledger-period")).toContainText("Paiements initiés sur la période");
  await expect(page.getByRole("tab", { name: "30 jours" }).filter({ visible: true }).last()).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText("Taux rapproché")).toBeVisible();
  await expect(page.getByText("33,3 %", { exact: true })).toBeVisible();
  await expect(page.getByText("Carte bancaire", { exact: true }).filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByText("Apple Pay", { exact: true }).filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByText("PayPal", { exact: true }).filter({ visible: true }).first()).toBeVisible();
  const paymentMix = page.getByTestId("payment-method-mix");
  await expect(paymentMix).toContainText("Comment les clients choisissent de payer");
  await expect(paymentMix).toContainText("3 méthodes");
  await expect(paymentMix).toContainText("PayPal");
  await expect(page.getByTestId("payment-market-coverage")).toContainText("France");
  await expect(page.getByTestId("payment-market-coverage")).toContainText("EUR");
  await expect(page.getByTestId("payment-pagination")).toContainText("1-3 sur 3");
  await page.getByRole("tab", { name: /Exceptions/ }).click();
  await expect(page.getByText("pi_jma_failed", { exact: true }).filter({ visible: true }).first()).toBeVisible();
  const paymentsDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exporter la page" }).click();
  expect((await paymentsDownload).suggestedFilename()).toBe("je-mange-africain-encaissements.csv");

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  const blocking = results.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious");
  expect(blocking, blocking.map((violation) => `${violation.id}: ${violation.help}`).join("\n")).toEqual([]);
  await expectBrandSafeUiColors(page);

  if (process.env.ADMIN_SCREENSHOTS) {
    const directory = join(process.cwd(), "output", "playwright", "admin-review");
    mkdirSync(directory, { recursive: true });
    await page.screenshot({ path: join(directory, `finance-ledger-${(page.viewportSize()?.width || 0) < 768 ? "mobile" : "desktop"}.png`), fullPage: false });
  }
});

test("a sensitive refund is confirmed, audited and reflected without overflow", async ({ page }) => {
  test.setTimeout(120_000);
  let submittedRefund: Record<string, unknown> | null = null;
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/admin/payments/payment-1/refund" && request.method() === "POST") submittedRefund = request.postDataJSON();
  });
  await mockAdminApi(page);
  await page.goto("/admin#finance", { waitUntil: "domcontentloaded" });
  await page.getByRole("tab", { name: "Encaissements" }).click();

  await page.getByRole("button", { name: /Rembourser/ }).filter({ visible: true }).first().click();
  const dialog = page.getByTestId("payment-refund-dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAccessibleName("Confirmer un remboursement");
  await expect(dialog).toContainText("48,70 €");
  await expect(dialog).toContainText("ne pourra pas être annulée");
  await dialog.getByRole("button", { name: "Montant partiel" }).click();
  await dialog.getByLabel("Montant à rembourser").fill("12.50");
  await dialog.getByLabel("Motif opérationnel").selectOption("delivery_incident");
  await dialog.getByLabel("Justification interne").fill("Retard transporteur confirmé par le suivi du colis.");
  await expect(dialog).toContainText("La commande conservera son état logistique");

  const overflow = await dialog.evaluate((element) => element.scrollWidth - element.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  const accessibility = await new AxeBuilder({ page }).include('[data-testid="payment-refund-dialog"]').withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  const blocking = accessibility.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious");
  expect(blocking, blocking.map((violation) => `${violation.id}: ${violation.help}`).join("\n")).toEqual([]);

  if (process.env.ADMIN_SCREENSHOTS) {
    const directory = join(process.cwd(), "output", "playwright", "admin-review");
    mkdirSync(directory, { recursive: true });
    await page.screenshot({ path: join(directory, `payment-refund-${(page.viewportSize()?.width || 0) < 768 ? "mobile" : "desktop"}.png`), scale: "css" });
  }

  await dialog.getByRole("button", { name: "Oui, rembourser 12,50 €" }).click();
  await expect(dialog.getByText("Remboursement confirmé", { exact: true })).toBeVisible();
  await expect.poll(() => submittedRefund).toMatchObject({ amount: 12.5, reason: "delivery_incident", note: "Retard transporteur confirmé par le suivi du colis.", locale: "fr" });
  expect(submittedRefund).toHaveProperty("requestId");
  await dialog.getByRole("button", { name: "Fermer" }).click();
  if ((page.viewportSize()?.width || 0) < 768) await expect(page.getByText("-12,50 €", { exact: true }).filter({ visible: true }).first()).toBeVisible();
  else await expect(page.getByText(/12,50 € remboursés ou engagés/).filter({ visible: true }).first()).toBeVisible();
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
  await receiptDialog.getByRole("button", { name: "Fermer" }).click();
  const receiptDiscard = page.getByRole("alertdialog", { name: "Abandonner cette réception ?" });
  await expect(receiptDiscard).toBeVisible();
  await expect(receiptDiscard).toContainText("Aucun stock physique ou vendable ne sera modifié");
  await expect.poll(() => receiptPayloads.length).toBe(0);
  if (process.env.ADMIN_SCREENSHOTS) {
    const directory = join(process.cwd(), "output", "playwright", "admin-review");
    mkdirSync(directory, { recursive: true });
    await page.screenshot({ path: join(directory, `inventory-receipt-discard-${(page.viewportSize()?.width || 0) < 768 ? "mobile" : "desktop"}.png`), fullPage: false });
  }
  await receiptDiscard.getByRole("button", { name: "Continuer la réception" }).click();
  await expect(receiptDialog.getByLabel("Numéro de lot")).toHaveValue("ATT-2609-FR");
  await expect(receiptDialog.getByLabel("Quantité physique")).toHaveValue("48");
  await expect(receiptDialog.getByLabel("Coût brut unitaire (€)")).toHaveValue("2.95");
  if (process.env.ADMIN_SCREENSHOTS) {
    const directory = join(process.cwd(), "output", "playwright", "admin-review");
    mkdirSync(directory, { recursive: true });
    await page.screenshot({ path: join(directory, `inventory-receipt-${(page.viewportSize()?.width || 0) < 768 ? "mobile" : "desktop"}.png`), fullPage: false });
  }
  await receiptDialog.getByRole("button", { name: "Enregistrer la réception" }).click();
  const receiptConfirmation = page.getByRole("alertdialog", { name: "Rendre ce lot disponible ?" });
  await expect(receiptConfirmation).toBeVisible();
  await expect(receiptConfirmation).toContainText("48 unité(s) de Attiéké frais");
  await expect(receiptConfirmation).toContainText("141,60 €");
  await expect(receiptConfirmation).toContainText("stock vendable");
  await expect.poll(() => receiptPayloads.length).toBe(0);
  const receiptConfirmationAccessibility = await new AxeBuilder({ page }).include('[role="alertdialog"]').withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(receiptConfirmationAccessibility.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious")).toEqual([]);
  if (process.env.ADMIN_SCREENSHOTS) {
    const directory = join(process.cwd(), "output", "playwright", "admin-review");
    await page.screenshot({ path: join(directory, `inventory-receipt-confirmation-${(page.viewportSize()?.width || 0) < 768 ? "mobile" : "desktop"}.png`), fullPage: false });
  }
  await receiptConfirmation.getByRole("button", { name: "Confirmer la réception" }).click();
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
  await controlDialog.getByRole("button", { name: "Fermer" }).click();
  const adjustmentDiscard = page.getByRole("alertdialog", { name: "Abandonner les modifications du lot ?" });
  await expect(adjustmentDiscard).toBeVisible();
  await expect(adjustmentDiscard).toContainText("Le stock physique, le stock vendable et le statut du lot resteront inchangés");
  await expect.poll(() => mutationPayloads.length).toBe(0);
  await adjustmentDiscard.getByRole("button", { name: "Continuer la modification" }).click();
  await expect(controlDialog.getByLabel("Quantité d'ajustement")).toHaveValue("6");
  await expect(controlDialog.getByLabel("Motif du mouvement")).toHaveValue("Comptage physique du matin");
  await controlDialog.getByRole("button", { name: "Appliquer" }).click();
  const adjustmentConfirmation = page.getByRole("alertdialog", { name: "Confirmer cet ajustement ?" });
  await expect(adjustmentConfirmation).toBeVisible();
  await expect(adjustmentConfirmation).toContainText("stock physique passera de 120 à 126");
  await expect(adjustmentConfirmation).toContainText("quantité non réservée de 84 à 90");
  await expect.poll(() => mutationPayloads.length).toBe(0);
  if (process.env.ADMIN_SCREENSHOTS) {
    const directory = join(process.cwd(), "output", "playwright", "admin-review");
    await page.screenshot({ path: join(directory, `inventory-adjustment-confirmation-${(page.viewportSize()?.width || 0) < 768 ? "mobile" : "desktop"}.png`), fullPage: false });
  }
  await adjustmentConfirmation.getByRole("button", { name: "Confirmer l'ajustement" }).click();
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
  await expect(page.getByText(/75 disponibles/).filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByText(/9 réservés/).filter({ visible: true }).first()).toBeVisible();
  if ((page.viewportSize()?.width || 0) >= 768) await expect(page.getByText(/84 physiques/).filter({ visible: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "Modifier la fiche Attiéké frais" }).click();

  const dialog = page.getByRole("dialog", { name: "Modifier la fiche produit" });
  await expect(dialog).toBeVisible();
  const studioSteps = dialog.getByRole("tablist", { name: "Étapes de la fiche produit" });
  await expect(studioSteps.getByRole("tab")).toHaveCount(4);
  await expect(studioSteps.getByRole("tab", { name: /Identité/ })).toHaveAttribute("aria-selected", "true");
  await expect(dialog.getByLabel("Nom commercial français")).toHaveValue("Attiéké frais");
  await expect(dialog.getByLabel("Nom commercial anglais")).toHaveValue("Fresh attieke");
  await studioSteps.getByRole("tab", { name: /Prix/ }).click();
  await expect(studioSteps.getByRole("tab", { name: /Prix/ })).toHaveAttribute("aria-selected", "true");
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
    await dialog.getByTestId("product-studio-panel").evaluate((element) => { element.scrollTop = 0; });
    await page.screenshot({ path: join(directory, `product-edit-${(page.viewportSize()?.width || 0) < 768 ? "mobile" : "desktop"}.png`), fullPage: false });
  }
  const results = await new AxeBuilder({ page }).include('[role="dialog"]').withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  const blocking = results.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious");
  expect(blocking, blocking.map((violation) => `${violation.id}: ${violation.help}`).join("\n")).toEqual([]);
  await dialog.getByRole("button", { name: "Fermer" }).click();
  const discard = page.getByRole("alertdialog", { name: "Abandonner les modifications ?" });
  await expect(discard).toContainText("seront perdues");
  await discard.getByRole("button", { name: "Continuer la fiche" }).click();
  await expect(dialog).toBeVisible();
});

test("the guided product studio publishes a complete image-backed record", async ({ page }) => {
  let createdProduct: Record<string, unknown> | null = null;
  await mockAdminApi(page);
  await page.route("**/api/admin/products", async (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    createdProduct = route.request().postDataJSON();
    await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ product: { id: "product-new" } }) });
  });
  await page.route("**/api/admin/media", (route) => route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ asset: { publicUrl: "/products/attieke.webp", objectPath: "products/attieke.webp" } }) }));

  await page.goto("/admin#catalog", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Nouveau produit" }).click();
  const dialog = page.getByRole("dialog", { name: "Enregistrer un produit" });
  const steps = dialog.getByRole("tablist", { name: "Étapes de la fiche produit" });

  await dialog.getByLabel("Nom commercial français").fill("Farine de manioc premium");
  await dialog.getByLabel("Nom commercial anglais").fill("Premium cassava flour");
  await dialog.getByLabel("Nom traditionnel").fill("Gari");
  await dialog.getByLabel("SKU").fill("JMA-GAR-500");
  await dialog.getByLabel("Catégorie").selectOption("cat-1");
  await dialog.getByLabel("Conditionnement").fill("Sachet 500 g");
  await dialog.getByLabel("Description française").fill("Farine de manioc fine, sèche et prête à cuisiner.");
  await dialog.getByLabel("Description anglaise").fill("Fine dry cassava flour, ready for everyday cooking.");
  await expect(steps.getByRole("tab", { name: /Identité/ })).toHaveAttribute("aria-selected", "true");
  await dialog.getByRole("button", { name: "Suivant" }).click();

  await dialog.getByLabel("Coût brut d'achat (€)").fill("2.40");
  await dialog.getByLabel("Marge bénéficiaire (€)").fill("1.60");
  await dialog.getByLabel("Prix promotionnel (€)").fill("3.20");
  await expect(dialog.getByText("4,00 €", { exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Suivant" }).click();

  await dialog.getByLabel("Stock disponible").fill("48");
  await dialog.getByLabel("Poids net (g)").fill("500");
  await dialog.getByLabel("Chaîne thermique").selectOption("AMBIANT");
  await dialog.getByRole("button", { name: "Suivant" }).click();

  await expect(steps.getByRole("tab", { name: /Publication/ })).toHaveAttribute("aria-selected", "true");
  await dialog.getByLabel("Choisir un fichier pour Photo principale du produit").setInputFiles({ name: "gari.webp", mimeType: "image/webp", buffer: Buffer.from([82, 73, 70, 70]) });
  await expect(dialog.getByRole("img", { name: "Photo principale du produit" })).toBeVisible();
  const storefrontPreview = dialog.getByTestId("product-storefront-preview");
  await expect(storefrontPreview).toContainText("Farine de manioc premium");
  await expect(storefrontPreview).toContainText("4,00 €");
  await expect(storefrontPreview).toContainText("3,20 €");
  await expect(storefrontPreview).toContainText("-20%");
  await expect(storefrontPreview).toContainText("Nouveau");
  await storefrontPreview.getByRole("button", { name: "en", exact: true }).click();
  await expect(storefrontPreview).toContainText("Premium cassava flour");
  await storefrontPreview.getByRole("button", { name: "fr", exact: true }).click();
  const publish = dialog.getByRole("button", { name: "Publier", exact: true });
  await expect(publish).toBeEnabled();
  await expectBrandSafeUiColors(page);
  expect(await dialog.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
  const accessibility = await new AxeBuilder({ page }).include('[data-testid="product-storefront-preview"]').withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  const blockingAccessibility = accessibility.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious");
  expect(blockingAccessibility, blockingAccessibility.map((violation) => `${violation.id}: ${violation.help}`).join("\n")).toEqual([]);
  if (process.env.ADMIN_SCREENSHOTS) {
    const directory = join(process.cwd(), "output", "playwright", "admin-review");
    mkdirSync(directory, { recursive: true });
    await storefrontPreview.scrollIntoViewIfNeeded();
    await page.screenshot({ path: join(directory, `product-storefront-preview-${(page.viewportSize()?.width || 0) < 768 ? "mobile" : "desktop"}.png`), fullPage: false });
    await dialog.getByTestId("product-studio-panel").evaluate((element) => { element.scrollTop = 0; });
    await page.screenshot({ path: join(directory, `product-studio-ready-${(page.viewportSize()?.width || 0) < 768 ? "mobile" : "desktop"}.png`), fullPage: false });
  }
  await publish.click();
  await expect(dialog).toBeHidden();
  expect(createdProduct).toMatchObject({
    nameFr: "Farine de manioc premium",
    nameEn: "Premium cassava flour",
    sku: "JMA-GAR-500",
    costPrice: "2.40",
    profitMargin: "1.60",
    promoPrice: "3.20",
    stockQty: "48",
    imageUrl: "/products/attieke.webp",
    status: "published",
  });
});

test("the recipe register stays compact and exposes operational readiness", async ({ page }) => {
  let editorialPayload: Record<string, unknown> | null = null;
  await mockAdminApi(page);
  await page.route("**/api/admin/recipes/recipe-1", async (route) => {
    if (route.request().method() !== "PATCH") return route.fallback();
    editorialPayload = route.request().postDataJSON();
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ recipe: { id: "recipe-1", status: editorialPayload?.status } }) });
  });
  await page.goto("/admin#recipes", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "Construire des recettes achetables" })).toBeVisible();
  const register = page.getByTestId("admin-recipe-register");
  const row = register.getByTestId("admin-recipe-row").filter({ visible: true }).first();
  await expect(row).toContainText("Attiéké poisson braisé");
  await expect(row).toContainText("7/8");
  await expect(row).toContainText(/stock à compléter/i);
  await expect(row).toContainText(/5 étapes/i);
  await expect(row.getByRole("img", { name: "Attiéké poisson braisé" })).toBeVisible();

  const mobile = (page.viewportSize()?.width || 0) < 768;
  const rowBox = await row.boundingBox();
  expect(rowBox?.height || Number.POSITIVE_INFINITY).toBeLessThanOrEqual(mobile ? 180 : 100);

  const filters = page.getByRole("group", { name: "Filtrer le registre des recettes" });
  await filters.getByRole("button", { name: /à vérifier/i }).click();
  await expect(row).toBeVisible();
  await filters.getByRole("button", { name: /brouillons/i }).click();
  await expect(page.getByText("Aucune recette trouvée")).toBeVisible();
  await filters.getByRole("button", { name: /toutes/i }).click();
  await expect(row).toBeVisible();

  await row.getByRole("button", { name: "Gérer Attiéké poisson braisé" }).click();
  const editorialDialog = page.getByRole("dialog", { name: "Piloter la publication" });
  await editorialDialog.getByLabel("Visibilité").selectOption("archived");
  await editorialDialog.getByLabel("Marquer comme nouveauté").check();
  await editorialDialog.getByRole("button", { name: "Annuler" }).click();
  const discard = page.getByRole("alertdialog", { name: "Abandonner les changements éditoriaux ?" });
  await expect(discard).toContainText("Aucun changement ne sera visible dans la boutique client");
  expect(editorialPayload).toBeNull();
  await discard.getByRole("button", { name: "Continuer l'édition" }).click();
  await expect(editorialDialog.getByLabel("Visibilité")).toHaveValue("archived");
  await expect(editorialDialog.getByLabel("Marquer comme nouveauté")).toBeChecked();
  await editorialDialog.getByRole("button", { name: "Enregistrer" }).click();
  const archiveConfirmation = page.getByRole("alertdialog", { name: "Désactiver ce contenu ?" });
  await expect(archiveConfirmation).toContainText("disparaîtra immédiatement de la boutique client");
  await expect(archiveConfirmation).toContainText("pourront être republiés");
  expect(editorialPayload).toBeNull();
  const archiveAccessibility = await new AxeBuilder({ page }).include('[role="alertdialog"]').withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(archiveAccessibility.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious")).toEqual([]);
  if (process.env.ADMIN_SCREENSHOTS) {
    const directory = join(process.cwd(), "output", "playwright", "admin-review");
    mkdirSync(directory, { recursive: true });
    await page.screenshot({ path: join(directory, `recipe-archive-confirmation-${mobile ? "mobile" : "desktop"}.png`), fullPage: false });
  }
  await archiveConfirmation.getByRole("button", { name: "Confirmer la désactivation" }).click();
  await expect(editorialDialog).toBeHidden();
  expect(editorialPayload).toMatchObject({ status: "archived", isNew: true, isRecommended: true, isPopular: true });

  await expectBrandSafeUiColors(page);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  if (process.env.ADMIN_SCREENSHOTS) {
    const directory = join(process.cwd(), "output", "playwright", "admin-review");
    mkdirSync(directory, { recursive: true });
    await page.screenshot({ path: join(directory, `recipe-register-${mobile ? "mobile" : "desktop"}.png`), fullPage: false });
  }
});

test("the advertising desk plans placements without oversized cards", async ({ page }) => {
  await mockAdminApi(page);
  await page.goto("/admin#advertising", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "Régie publicitaire" })).toBeVisible();
  await expect(page.getByTestId("advertising-metrics")).toContainText(/1\s*en cours/i);
  const register = page.getByTestId("advertising-register");
  const row = register.getByTestId("advertising-row").first();
  await expect(row).toContainText("Saveurs de Côte d'Ivoire");
  await expect(row).toContainText(/en cours/i);
  await expect(row).toContainText(/catalogue client/i);
  const artwork = row.getByRole("img", { name: "Table de plats ivoiriens" });
  await expect(artwork).toBeVisible();
  await expect.poll(() => artwork.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);

  const mobile = (page.viewportSize()?.width || 0) < 768;
  const rowBox = await row.boundingBox();
  expect(rowBox?.height || Number.POSITIVE_INFINITY).toBeLessThanOrEqual(mobile ? 160 : 132);

  const filters = page.getByTestId("advertising-filters");
  await filters.getByRole("button", { name: /planifiées/i }).click();
  await expect(page.getByText("Aucune affiche dans cette sélection")).toBeVisible();
  await filters.getByRole("button", { name: /en cours/i }).click();
  await expect(row).toBeVisible();
  const placement = filters.getByLabel("Filtrer par emplacement");
  await placement.selectOption("catalog");
  await expect(page.getByText("Aucune affiche dans cette sélection")).toBeVisible();
  await placement.selectOption("home");
  await expect(row).toBeVisible();
  await expect.poll(() => artwork.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);

  await page.getByRole("button", { name: "Nouvelle affiche" }).click();
  const editor = page.getByRole("dialog", { name: "Composer une affiche publicitaire" });
  const clientPreview = editor.getByTestId("advertising-client-preview");
  const artworkPreview = editor.getByTestId("advertising-artwork-preview");
  await expect(clientPreview).toContainText("Aperçu avant diffusion");
  await expect(artworkPreview).toHaveAttribute("data-advertisement-variant", "immersive");
  await editor.getByLabel("Titre français").fill("La semaine des saveurs ivoiriennes");
  await editor.getByLabel("Texte français").fill("Une sélection généreuse, disponible dans votre application.");
  await expect(artworkPreview).toContainText("La semaine des saveurs ivoiriennes");
  const previewEnglish = clientPreview.getByRole("button", { name: "en", exact: true });
  await previewEnglish.click();
  await expect(previewEnglish).toHaveAttribute("aria-pressed", "true");
  await expect(clientPreview.getByRole("button", { name: "fr", exact: true })).toHaveAttribute("aria-pressed", "false");
  await editor.getByLabel("Titre anglais").fill("Ivorian flavours this week");
  await expect(artworkPreview).toContainText("Ivorian flavours this week");
  await editor.getByLabel("Emplacement").selectOption("checkout");
  await expect(artworkPreview).toHaveAttribute("data-advertisement-variant", "compact");
  expect(await editor.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
  if (process.env.ADMIN_SCREENSHOTS) {
    const directory = join(process.cwd(), "output", "playwright", "admin-review");
    mkdirSync(directory, { recursive: true });
    await page.screenshot({ path: join(directory, `advertising-editor-preview-${mobile ? "mobile" : "desktop"}.png`), fullPage: false });
  }
  await page.keyboard.press("Escape");
  const discard = page.getByRole("alertdialog", { name: "Abandonner cette affiche ?" });
  await expect(discard).toBeVisible();
  await expect(discard).toContainText("les textes bilingues, la destination et le calendrier");
  if (process.env.ADMIN_SCREENSHOTS) {
    const directory = join(process.cwd(), "output", "playwright", "admin-review");
    await page.screenshot({ path: join(directory, `advertising-discard-confirmation-${mobile ? "mobile" : "desktop"}.png`), fullPage: false });
  }
  await discard.getByRole("button", { name: "Continuer l'affiche" }).click();
  await expect(editor).toBeVisible();
  await editor.getByRole("button", { name: "Annuler" }).click();
  await expect(discard).toBeVisible();
  await discard.getByRole("button", { name: "Oui, abandonner" }).click();
  await expect(editor).toBeHidden();

  await expectBrandSafeUiColors(page);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  if (process.env.ADMIN_SCREENSHOTS) {
    const directory = join(process.cwd(), "output", "playwright", "admin-review");
    mkdirSync(directory, { recursive: true });
    await page.screenshot({ path: join(directory, `advertising-register-${mobile ? "mobile" : "desktop"}.png`), fullPage: false });
  }
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
  const productSteps = productDialog.getByRole("tablist", { name: "Product record steps" });
  await expect(productSteps.getByRole("tab")).toHaveCount(4);
  await expect(productDialog.getByLabel("French product name")).toBeVisible();
  await expect(productDialog.getByLabel("French description")).toBeVisible();
  await productSteps.getByRole("tab", { name: /Logistics/ }).click();
  await expect(productDialog.getByLabel("Thermal class").locator("option")).toHaveText(["Ambient", "Refrigerated", "Frozen"]);
  await expect(productDialog.getByLabel("Storage").locator("option")).toHaveText(["Dry", "Fresh", "Refrigerated", "Frozen", "Smoked", "Dried", "Preserved"]);
  await productSteps.getByRole("tab", { name: /Publishing/ }).click();
  await expect(productDialog.getByText("Main product photo")).toBeVisible();
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

test("the recipe studio imports a documented dish and exposes every unresolved stock link", async ({ page }) => {
  await mockAdminApi(page);
  await page.goto("/admin#recipes", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Nouvelle recette" }).click();

  const dialog = page.getByRole("dialog", { name: "Composer une recette achetable" });
  const importer = dialog.getByTestId("recipe-template-importer");
  await importer.getByRole("button", { name: "Choisir un plat" }).click();
  await importer.getByLabel("Rechercher dans la bibliothèque").fill("garba");
  await expect(importer.getByTestId("recipe-template-results")).toContainText("Garba ivoirien");
  await expect(importer.getByText("1/2", { exact: false })).toBeVisible();
  await importer.getByRole("button", { name: "Importer Garba ivoirien" }).click();

  await expect(dialog.getByLabel("Titre français")).toHaveValue("Garba ivoirien");
  await expect(dialog.getByLabel("Titre anglais")).toHaveValue("Ivorian garba");
  await expect(dialog.getByLabel("Pays d'origine")).toHaveValue("Côte d'Ivoire");
  await expect(dialog.getByLabel("Durée en minutes")).toHaveValue("25");
  await expect(dialog.getByLabel("Nombre de portions")).toHaveValue("4");
  await expect(importer).toContainText("1/2");
  const storefrontPreview = dialog.getByTestId("recipe-storefront-preview");
  await expect(storefrontPreview).toContainText("Garba ivoirien");
  await expect(storefrontPreview).toContainText("Côte d'Ivoire");
  await expect(storefrontPreview).toContainText("25 min");
  await expect(storefrontPreview).toContainText("Recommandée");
  await expect(storefrontPreview.getByRole("img", { name: "Garba ivoirien" })).toBeVisible();
  await storefrontPreview.getByRole("button", { name: "en", exact: true }).click();
  await expect(storefrontPreview).toContainText("Ivorian garba");
  await storefrontPreview.getByRole("button", { name: "fr", exact: true }).click();

  const linkedProduct = dialog.getByLabel("Produit 1");
  const unresolvedProduct = dialog.getByLabel("Produit 2");
  await expect(linkedProduct).toHaveValue("product-1");
  await expect(dialog.getByLabel("Quantité 1")).toHaveValue("600");
  await expect(unresolvedProduct).toHaveValue("");
  await expect(dialog.getByText(/Thon frais \/ Fresh tuna.*à relier/)).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Enregistrer le brouillon" })).toBeDisabled();
  if (process.env.ADMIN_SCREENSHOTS) {
    const directory = join(process.cwd(), "output", "playwright", "admin-review");
    mkdirSync(directory, { recursive: true });
    await storefrontPreview.scrollIntoViewIfNeeded();
    await page.screenshot({ path: join(directory, `recipe-storefront-preview-${(page.viewportSize()?.width || 0) < 768 ? "mobile" : "desktop"}.png`), fullPage: false });
    await unresolvedProduct.scrollIntoViewIfNeeded();
    await page.screenshot({ path: join(directory, `recipe-library-import-${(page.viewportSize()?.width || 0) < 768 ? "mobile" : "desktop"}.png`), fullPage: false });
  }

  await unresolvedProduct.selectOption("product-1");
  await expect(dialog.getByRole("button", { name: "Enregistrer le brouillon" })).toBeEnabled();
  await dialog.getByLabel("Titre français").fill("Garba maison");
  await importer.getByRole("button", { name: "Changer de plat" }).click();
  await importer.getByRole("button", { name: "Importer Garba ivoirien" }).click();
  const replacement = page.getByRole("alertdialog", { name: "Remplacer la fiche en cours ?" });
  await expect(replacement).toContainText("La recette restera en brouillon");
  await replacement.getByRole("button", { name: "Conserver ma saisie" }).click();
  await expect(dialog.getByLabel("Titre français")).toHaveValue("Garba maison");

  const overflow = await dialog.evaluate((element) => element.scrollWidth - element.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  const accessibility = await new AxeBuilder({ page }).include('[role="dialog"]').analyze();
  expect(accessibility.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious")).toEqual([]);
  await page.keyboard.press("Escape");
  const discard = page.getByRole("alertdialog", { name: "Abandonner la recette en cours ?" });
  await expect(discard).toContainText("les étapes de préparation, les liaisons d'ingrédients");
  if (process.env.ADMIN_SCREENSHOTS) {
    const directory = join(process.cwd(), "output", "playwright", "admin-review");
    await page.screenshot({ path: join(directory, `recipe-discard-confirmation-${(page.viewportSize()?.width || 0) < 768 ? "mobile" : "desktop"}.png`), fullPage: false });
  }
  await discard.getByRole("button", { name: "Continuer la recette" }).click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Annuler" }).click();
  await expect(discard).toBeVisible();
  await discard.getByRole("button", { name: "Oui, abandonner" }).click();
  await expect(dialog).toBeHidden();
});

test("the order workspace saves logistics and confirms each sensitive advancement", async ({ page }) => {
  await mockAdminApi(page);
  await page.goto("/admin#orders", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Du paiement jusqu'à la porte" })).toBeVisible();
  const mobile = (page.viewportSize()?.width || 0) < 768;
  const preparingFilter = page.getByRole("button", { name: /En préparation, 1/ });
  await preparingFilter.click();
  await expect(preparingFilter).toHaveAttribute("aria-pressed", "true");
  const orderCard = page.getByTestId("admin-order-card-order-1");
  await expect(orderCard).toBeVisible();
  const orderProductImage = orderCard.getByRole("img", { name: "Attiéké frais" });
  await expect(orderProductImage).toBeVisible();
  await expect.poll(() => orderProductImage.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
  await expect(orderCard.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "50");
  await expect(orderCard).toContainText("Prochaine: Colis prêt");
  if (process.env.ADMIN_SCREENSHOTS) {
    const directory = join(process.cwd(), "output", "playwright", "admin-review");
    mkdirSync(directory, { recursive: true });
    await page.screenshot({ path: join(directory, `orders-operational-${mobile ? "mobile" : "desktop"}.png`), fullPage: false });
  }
  await orderCard.click();

  const dialog = page.getByRole("dialog", { name: "JMA-260902-0142" });
  await expect(dialog.getByText("48,70 €", { exact: true }).first()).toBeVisible();
  await expect(dialog.getByText("1 article(s)", { exact: true }).first()).toBeVisible();
  await expect(dialog.getByText("2 colis", { exact: true }).first()).toBeVisible();
  await expect(dialog.getByRole("heading", { name: "Préparer, tracer et remettre" })).toBeVisible();
  await expect(dialog.getByText("aminata@example.fr")).toBeVisible();
  await expect(dialog.getByText("Livraison standard")).toBeVisible();
  await expect(dialog.getByText("Sachet 500 g", { exact: true })).toBeVisible();
  const orderProgress = dialog.getByTestId("admin-order-progress");
  await expect(orderProgress.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "50");
  await expect(orderProgress.locator('[aria-current="step"]')).toContainText("Préparation");
  await expect(orderProgress).toContainText("Transport et suivi");
  if (process.env.ADMIN_SCREENSHOTS) {
    const directory = join(process.cwd(), "output", "playwright", "admin-review");
    await page.screenshot({ path: join(directory, `order-control-${mobile ? "mobile" : "desktop"}.png`), fullPage: false });
  }
  await dialog.getByLabel("Transporteur").fill("Chrono Frais Europe");
  await dialog.getByLabel("Numéro de suivi").fill("JMA-FR-260902-ADV");
  await dialog.getByLabel("Notes internes d'exploitation").fill("Chaîne du froid contrôlée avant emballage.");
  await dialog.getByRole("button", { name: "Enregistrer la logistique" }).click();
  await expect(dialog.getByRole("status")).toContainText("La fiche logistique est enregistrée.");

  const activeParcel = dialog.getByLabel("Colis actif");
  await activeParcel.selectOption("new");
  await expect(dialog.getByLabel("Transporteur")).toHaveValue("");
  await expect(dialog.getByLabel("Numéro de suivi")).toHaveValue("");
  await dialog.getByLabel("Conservation").selectOption("AMBIANT");
  await dialog.getByLabel("Transporteur").fill("DPD Europe");
  await dialog.getByLabel("Numéro de suivi").fill("JMA-AMBIENT-260902");
  await dialog.getByRole("button", { name: "Enregistrer la logistique" }).click();
  await expect(activeParcel).toHaveValue("shipment-2");
  await expect(activeParcel.locator("option")).toContainText(["Colis 1 · JMA-FR-260902-ADV", "Colis 2 · JMA-AMBIENT-260902", "+ Nouveau colis"]);
  await activeParcel.selectOption("shipment-1");

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
  const mobile = (page.viewportSize()?.width || 0) < 768;
  await expect(page.getByRole("heading", { name: "Piloter chaque relation" })).toBeVisible();
  await expect(page.getByText("80 %", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Composition du portefeuille" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Prochaines attentions" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Ouvrir le profil de Idrissa Traoré/ })).toBeVisible();
  await expect(page.getByText("426,40 €", { exact: true }).filter({ visible: true }).first()).toBeVisible();

  await page.getByRole("tab", { name: /À relancer/ }).click();
  await expect(page.getByRole("button", { name: "Ouvrir le profil de Idrissa Traoré" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Ouvrir le profil de Aminata Koné" })).toBeHidden();
  await page.getByRole("tab", { name: /^Tous/ }).click();

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exporter" }).click();
  expect((await download).suggestedFilename()).toBe("je-mange-africain-clients.csv");

  if (process.env.ADMIN_SCREENSHOTS) {
    const directory = join(process.cwd(), "output", "playwright", "admin-review");
    mkdirSync(directory, { recursive: true });
    await page.screenshot({ path: join(directory, `customers-portfolio-${(page.viewportSize()?.width || 0) < 768 ? "mobile" : "desktop"}.png`), fullPage: true });
  }

  const workspaceOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(workspaceOverflow).toBeLessThanOrEqual(1);
  const workspaceA11y = await new AxeBuilder({ page }).include("main").withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(workspaceA11y.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious")).toEqual([]);
  await expectBrandSafeUiColors(page);

  await page.getByRole("button", { name: "Ouvrir le profil de Aminata Koné" }).click();

  const dialog = page.getByRole("dialog", { name: "Aminata Koné" });
  await expect(dialog.getByRole("link", { name: "Envoyer un e-mail à Aminata Koné" })).toHaveAttribute("href", "mailto:aminata@example.fr");
  await expect(dialog.getByRole("link", { name: "Appeler Aminata Koné" })).toHaveAttribute("href", "tel:+33600000000");
  await expect(dialog.getByText("Produits les plus achetés")).toBeVisible();
  await expect(dialog.getByText("Attiéké poisson braisé")).toBeVisible();
  await dialog.getByRole("tab", { name: /Commandes/ }).click();
  await expect(dialog.getByText("JMA-260902-0142")).toBeVisible();
  await expect(dialog.getByText("48,70 €")).toBeVisible();
  await dialog.getByRole("tab", { name: /Relation/ }).click();
  await expect(dialog.getByText("Précision sur mon créneau de livraison")).toBeVisible();
  const notes = dialog.getByLabel("Notes internes sur le client");
  await notes.fill("Cliente fidèle, préfère les produits frais ivoiriens.");
  await page.getByRole("button", { name: "Fermer" }).click();
  const discard = page.getByRole("alertdialog", { name: "Abandonner la note client ?" });
  await expect(discard).toBeVisible();
  await expect(discard).toContainText("n'a pas été enregistré et sera perdu");
  await expect(discard).toContainText("Le profil client et son historique ne seront pas modifiés");
  if (process.env.ADMIN_SCREENSHOTS) {
    const directory = join(process.cwd(), "output", "playwright", "admin-review");
    mkdirSync(directory, { recursive: true });
    await page.screenshot({ path: join(directory, `customer-note-discard-${mobile ? "mobile" : "desktop"}.png`), fullPage: false });
  }
  const discardResults = await new AxeBuilder({ page }).include('[role="alertdialog"]').withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(discardResults.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious")).toEqual([]);
  await discard.getByRole("button", { name: "Continuer la note" }).click();
  await expect(dialog).toBeVisible();
  await expect(notes).toHaveValue("Cliente fidèle, préfère les produits frais ivoiriens.");
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

  await page.getByRole("button", { name: "Fermer" }).click();
  await expect(dialog).toBeHidden();
  await expect(discard).toBeHidden();
  if (mobile) await page.getByRole("button", { name: "Ouvrir la navigation" }).click();
  await page.getByRole("button", { name: "en", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Portfolio composition" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Next attentions" })).toBeVisible();
  await expect(page.getByText("Relationship priority", { exact: true })).toBeVisible();
});

test("push campaigns target a measured audience and preview both languages", async ({ page }) => {
  await mockAdminApi(page);
  await page.goto("/admin#campaigns", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Composer, vérifier, diffuser" })).toBeVisible();
  await expect(page.locator('img[src*="notification-icon-burgundy"]').first()).toBeVisible();
  const readiness = page.getByTestId("campaign-readiness");
  await expect(readiness.getByText("2 contrôles sur 4")).toBeVisible();
  await expect(page.getByRole("button", { name: "Vérifier puis diffuser" })).toBeDisabled();
  await page.getByLabel("Titre français").fill("Les saveurs du week-end");
  await page.getByLabel("Message français").fill("Découvrez une sélection ivoirienne préparée pour vous.");
  if ((page.viewportSize()?.width || 0) < 768) {
    await page.getByRole("tablist", { name: "Langue du message" }).getByRole("tab", { name: /EN English/ }).click();
  }
  await page.getByLabel("English title").fill("Weekend flavours");
  await page.getByLabel("English message").fill("Discover an Ivorian selection prepared for you.");
  await page.getByLabel("Audience", { exact: true }).selectOption("ambassador");
  await expect(page.getByText("184 appareil(s) ciblé(s)")).toBeVisible();
  await expect(readiness.getByText("4 contrôles sur 4")).toBeVisible();
  await expect(page.getByRole("button", { name: "Vérifier puis diffuser" })).toBeEnabled();
  await page.getByLabel("Langue de l’aperçu").getByRole("button", { name: "en", exact: true }).click();
  await expect(page.getByText("Weekend flavours")).toBeVisible();
  const history = page.getByRole("region", { name: "Résultats récents" });
  await expect(history.getByText("98,5 %", { exact: true }).first()).toBeVisible();
  await expect(history.getByText("1 249", { exact: true })).toBeVisible();
  await expect(history.getByTestId("push-history-row")).toHaveCount(1);
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
  await expectBrandSafeUiColors(page);
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

test("the recipe studio edits bilingual preparation and stock-linked ingredients", async ({ page }) => {
  await mockAdminApi(page);
  await page.goto("/admin#recipes", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Construire des recettes achetables" })).toBeVisible();

  await page.getByRole("button", { name: "Modifier la fiche Attiéké poisson braisé" }).click();
  const dialog = page.getByRole("dialog", { name: "Modifier la recette achetable" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("Titre français")).toHaveValue("Attiéké poisson braisé");
  await expect(dialog.getByLabel("Titre anglais")).toHaveValue("Attieke with grilled fish");
  await expect(dialog.getByLabel("Étape 1 en français")).toHaveValue("Assaisonner soigneusement le poisson.");
  await expect(dialog.getByLabel("Step 1 in English")).toHaveValue("Season the fish thoroughly.");
  await expect(dialog.getByTestId("recipe-step-preview-1")).toContainText(/aperçu du guide client|customer guide preview/i);
  await expect(dialog.getByTestId("recipe-step-preview-1")).toContainText(/résultat attendu|expected result/i);
  await expect(dialog.getByLabel("Temps actif de l'étape 1")).toHaveValue("5");
  await expect(dialog.getByLabel("Résultat attendu de l'étape 1 fr")).not.toHaveValue("");
  await expect(dialog.getByLabel("Titre de l'étape 1 fr")).not.toHaveValue("");
  await expect(dialog.getByLabel("Pourquoi de l'étape 1 fr")).not.toHaveValue("");
  await expect(dialog.getByLabel("Rattrapage de l'étape 1 fr")).not.toHaveValue("");
  await dialog.getByLabel("Matériel de l'étape 1 fr").fill("");
  await dialog.getByLabel("Conseil de l'étape 1 fr").fill("");
  await dialog.getByRole("button", { name: "Compléter les repères" }).first().click();
  await expect(dialog.getByLabel("Matériel de l'étape 1 fr")).not.toHaveValue("");
  await expect(dialog.getByLabel("Conseil de l'étape 1 fr")).not.toHaveValue("");
  await expect(dialog.getByLabel("Produit 1")).toHaveValue("product-1");
  await expect(dialog.getByText(/75 disponibles/)).toBeVisible();
  await expect(dialog.getByText(/9 réservés/)).toBeVisible();
  const alternatives = dialog.getByTestId("recipe-alternatives-1");
  await alternatives.locator("summary").click();
  const selectedAlternative = alternatives.getByRole("button", { name: /retirer fonio précuit des alternatives/i });
  await expect(selectedAlternative).toHaveAttribute("aria-pressed", "true");
  const alternativeImage = selectedAlternative.locator("img");
  await expect(alternativeImage).toBeVisible();
  await expect.poll(() => alternativeImage.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  await selectedAlternative.click();
  const availableAlternative = alternatives.getByRole("button", { name: /ajouter fonio précuit aux alternatives/i });
  await expect(availableAlternative).toHaveAttribute("aria-pressed", "false");
  await availableAlternative.click();
  await expect(selectedAlternative).toHaveAttribute("aria-pressed", "true");
  const dialogOverflow = await dialog.evaluate((element) => element.scrollWidth - element.clientWidth);
  expect(dialogOverflow).toBeLessThanOrEqual(1);
  const accessibility = await new AxeBuilder({ page }).include('[role="dialog"]').withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  const blockingAccessibility = accessibility.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious");
  expect(blockingAccessibility, blockingAccessibility.map((violation) => `${violation.id}: ${violation.help}`).join("\n")).toEqual([]);

  await dialog.getByRole("button", { name: "Descendre l'étape 1" }).click();
  await expect(dialog.getByLabel("Étape 1 en français")).toHaveValue("Braiser puis servir avec l'attiéké.");
  await expect(dialog.getByLabel("Step 1 in English")).toHaveValue("Grill and serve with the attieke.");
  await expect(dialog.getByLabel("Temps actif de l'étape 1")).toHaveValue("10");
  await dialog.getByLabel("Temps de repos de l'étape 1").fill("7");
  await dialog.getByLabel("Température de l'étape 1").fill("180");
  await dialog.getByLabel("Matériel de l'étape 1 fr").fill("Gril, pince longue et thermomètre");
  await dialog.getByLabel("Step equipment 1 en").fill("Grill, long tongs and thermometer");
  await dialog.getByRole("checkbox", { name: "Utiliser Attiéké frais à l'étape 1" }).check();
  if (process.env.ADMIN_SCREENSHOTS) {
    const directory = join(process.cwd(), "output", "playwright", "admin-review");
    mkdirSync(directory, { recursive: true });
    await page.screenshot({ path: join(directory, `recipe-editor-${(page.viewportSize()?.width || 0) < 768 ? "mobile" : "desktop"}.png`), scale: "css" });
  }

  const requestPromise = page.waitForRequest((request) => new URL(request.url()).pathname === "/api/admin/recipes/recipe-1" && request.method() === "PATCH");
  await dialog.getByRole("button", { name: "Enregistrer les modifications" }).click();
  const updateRequest = await requestPromise;
  const update = updateRequest.postDataJSON() as { stepsFr: string[]; stepsEn: string[]; stepDetails: Array<{ durationMinutes: string; restMinutes: string; temperatureC: string; equipmentFr: string; equipmentEn: string; titleFr: string; whyFr: string; recoveryFr: string; ingredientProductIds: string[] }>; ingredients: Array<{ productId: string; quantityPerBase: string; alternativeProductIds: string[] }> };
  expect(update.stepsFr[0]).toBe("Braiser puis servir avec l'attiéké.");
  expect(update.stepsEn[0]).toBe("Grill and serve with the attieke.");
  expect(update.stepDetails[0]).toMatchObject({ durationMinutes: "10", restMinutes: "7", temperatureC: "180", equipmentFr: "Gril, pince longue et thermomètre", equipmentEn: "Grill, long tongs and thermometer" });
  expect(update.stepDetails[0].titleFr).not.toBe("");
  expect(update.stepDetails[0].whyFr).not.toBe("");
  expect(update.stepDetails[0].recoveryFr).not.toBe("");
  expect(update.stepDetails[0].ingredientProductIds).toEqual(["product-1"]);
  expect(update.ingredients[0]).toMatchObject({ productId: "product-1", quantityPerBase: "500", alternativeProductIds: ["product-2"] });
  await expect(dialog).toBeHidden();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await expectBrandSafeUiColors(page);
});
