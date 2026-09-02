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
  city: string;
  orders: number;
  loyalty: number;
  walletCredit: number;
  preferredLang: string;
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
