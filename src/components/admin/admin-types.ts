export type AdminSectionId =
  | "overview"
  | "catalog"
  | "recipes"
  | "orders"
  | "inventory"
  | "customers"
  | "campaigns"
  | "advertising"
  | "finance"
  | "governance"
  | "team";

export type DashboardPayload = {
  generatedAt: string;
  kpis: {
    revenueToday: number;
    revenueMonth: number;
    orders: number;
    monthOrders: number;
    avgBasket: number;
    outOfStock: number;
    expiringSoon: number;
    customers: number;
    toPrepare: number;
    activeOrders: number;
    inDelivery: number;
    paymentAttention: number;
    newCustomersMonth: number;
    stockCoverageRate: number;
  };
  comparison: {
    revenue: number | null;
    orders: number | null;
    averageBasket: number | null;
  };
  pulse: Array<{ date: string; label: string; revenue: number; orders: number }>;
  workflow: Array<{ id: "validate" | "prepare" | "deliver" | "closed"; count: number }>;
  priorities: Array<{
    id: string;
    level: "critical" | "attention" | "monitor";
    count: number;
    title: string;
    detail: string;
    target: AdminSectionId;
  }>;
  recentOrders: Array<{
    id: string;
    number: string;
    status: string;
    total: number;
    createdAt: string;
    deliveryName: string;
    deliveryCity: string;
    itemCount: number;
    imageUrl?: string | null;
  }>;
  topProducts: Array<{
    productId: string;
    name: string;
    imageUrl?: string | null;
    imageColor: string;
    units: number;
    revenue: number;
  }>;
};

export type AdminOrder = {
  id: string;
  number: string;
  status: string;
  subtotal: number;
  shippingCost: number;
  vatAmount: number;
  promoDiscount: number;
  total: number;
  weightGrams: number;
  packageCount: number;
  createdAt: string;
  deliveryName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  deliveryAddress: string;
  deliveryCity: string;
  deliveryPostalCode: string;
  deliveryCountry: string;
  deliverySlot?: string | null;
  paymentMethod?: string | null;
  notes?: string | null;
  items: Array<{
    id: string;
    nameFr: string;
    nameEn: string;
    sku: string;
    unitPrice: number;
    qty: number;
    lineTotal: number;
    thermalClass: string;
    imageUrl?: string | null;
    salesChannel?: "retail" | "wholesale";
    unitsPerPack?: number;
  }>;
  shipments: Array<{
    id: string;
    trackingNumber?: string | null;
    thermalClass: string;
    status: string;
    estimatedDelivery?: string | null;
    actualDelivery?: string | null;
    confirmCode?: string | null;
    carrier?: string | null;
    trackingUrl?: string | null;
    proofPhoto?: string | null;
    signature?: string | null;
  }>;
  timeline: Array<{ status: string; label: string; at: string; actor?: string | null }>;
  payments: Array<{ id?: string; method: string; status: string; amount: number; reference?: string | null; createdAt?: string }>;
};

export type AdminCustomer = {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  city: string;
  country: string;
  orders: number;
  loyalty: number;
  walletCredit: number;
  preferredLang: string;
  lifetimeValue: number;
  averageBasket: number;
  lastOrderAt?: string | null;
  joinedAt: string;
  addresses: number;
  favorites: number;
  savedRecipes: number;
  openTickets: number;
  segment: "ambassador" | "active" | "at_risk" | "new";
};

export type AdminCustomerPortfolioPayload = {
  generatedAt: string;
  customers: AdminCustomer[];
  summary: {
    total: number;
    lifetimeValue: number;
    averageCustomerValue: number;
    averageBasket: number;
    totalOrders: number;
    repeatCustomers: number;
    repeatRate: number;
    profileCoverageRate: number;
    savedIntentRate: number;
    openTickets: number;
    atRiskValue: number;
    actionable: number;
    segments: Record<AdminCustomer["segment"], number>;
    markets: number;
    languages: { fr: number; en: number; other: number };
  };
  actions: Array<{
    id: string;
    customerId: string;
    customerName: string;
    kind: "support" | "reengage" | "activate" | "complete_profile" | "reward";
    level: "critical" | "attention" | "opportunity";
    score: number;
    count: number;
    value: number;
    daysSinceActivity: number | null;
  }>;
};

export type AdminCustomerDetail = {
  customer: AdminCustomer & {
    notes: string;
    updatedAt: string;
  };
  metrics: {
    completedOrders: number;
    activeOrders: number;
    cancelledOrders: number;
  };
  addresses: Array<{
    id: string;
    label: string;
    recipient: string;
    street: string;
    postalCode: string;
    city: string;
    country: string;
    phone?: string | null;
    isDefault: boolean;
  }>;
  recentOrders: Array<{
    id: string;
    number: string;
    status: string;
    total: number;
    createdAt: string;
    itemCount: number;
    paymentMethod?: string | null;
    paymentStatus?: string | null;
    items: Array<{ id: string; name: string; qty: number; imageUrl?: string | null }>;
  }>;
  topProducts: Array<{
    productId: string;
    name: string;
    imageUrl?: string | null;
    quantity: number;
    revenue: number;
  }>;
  favorites: Array<{ id: string; productId: string; name: string; imageUrl?: string | null }>;
  savedRecipes: Array<{ id: string; recipeId: string; title: string; country: string; imageUrl?: string | null }>;
  tickets: Array<{
    id: string;
    number: string;
    subject: string;
    priority: string;
    status: string;
    assignee?: string | null;
    updatedAt: string;
  }>;
};

export type InventoryBatch = {
  id: string;
  lotNumber: string;
  productId: string;
  productName: string;
  productSku?: string;
  productImageUrl?: string | null;
  productImageColor?: string;
  thermalClass?: "AMBIANT" | "REFRIGERATED" | "FROZEN";
  quantity: number;
  reserved: number;
  expiryDate?: string | null;
  receiptDate: string;
  costPrice: number;
  status: "active" | "blocked" | "recalled" | "expired";
  warehouseId?: string;
  warehouse?: string | null;
};

export type InventoryProductOption = {
  id: string;
  name: string;
  sku: string;
  imageUrl?: string | null;
  imageColor?: string;
  thermalClass: "AMBIANT" | "REFRIGERATED" | "FROZEN";
  stockQty: number;
};

export type InventoryWarehouseOption = {
  id: string;
  name: string;
  city: string;
  supports: Array<"AMBIANT" | "REFRIGERATED" | "FROZEN">;
};

export type InventoryMovement = {
  id: string;
  batchId?: string | null;
  lotNumber?: string | null;
  productName: string;
  warehouse: string;
  type: string;
  quantity: number;
  reason?: string | null;
  createdAt: string;
};

export type InventoryPayload = {
  batches: InventoryBatch[];
  products?: InventoryProductOption[];
  warehouses?: InventoryWarehouseOption[];
  movements?: InventoryMovement[];
};

export type AuditEntry = {
  id: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  reason?: string | null;
  actor?: string | null;
  actorSource?: "identity" | "reason" | "system";
  ip?: string | null;
  createdAt: string;
  risk?: "critical" | "attention" | "routine";
  domain?: "access" | "stock" | "catalog" | "fulfillment" | "customers" | "marketing" | "finance" | "system";
  changes?: Array<{ field: string; before: string | null; after: string | null; kind: "added" | "removed" | "changed" }>;
  evidenceScore?: number;
};

export type AuditPayload = {
  period: "24h" | "7d" | "30d" | "all";
  generatedAt: string;
  hasMore: boolean;
  summary: {
    total: number;
    loaded: number;
    actors: number;
    risk: { critical: number; attention: number; routine: number };
    domains: Record<string, number>;
    evidenceRate: number;
    networkRate: number;
  };
  logs: AuditEntry[];
};
