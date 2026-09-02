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
  };
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
  payments: Array<{ method: string; status: string; amount: number; reference?: string | null }>;
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
  quantity: number;
  reserved: number;
  expiryDate?: string | null;
  receiptDate: string;
  costPrice: number;
  status: string;
  warehouse?: string | null;
};

export type AuditEntry = {
  id: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  reason?: string | null;
  actor?: string | null;
  ip?: string | null;
  createdAt: string;
};
