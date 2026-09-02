/* Shared storefront types (front-end mirrors of API responses). */

export interface ProductVariant {
  id: string;
  label: string;
  weightGrams: number;
  volumeMl: number;
  price: number;
  pricePerKg: number | null;
  isDefault: boolean;
}

export interface Product {
  id: string;
  sku: string;
  barcode: string | null;
  traditionalName: string;
  name: string;
  description: string;
  preparation: string;
  storage: string;
  ingredients: string;
  allergens: string;
  country: string;
  brandId: string | null;
  brandName: string | null;
  categoryId: string;
  categorySlug: string | null;
  categoryName: string | null;
  thermalClass: "AMBIANT" | "REFRIGERATED" | "FROZEN";
  storageType: string;
  storageTempC: string | null;
  netWeightGrams: number;
  volumeMl: number;
  unit: string;
  packaging: string;
  price: number;
  promoPrice: number | null;
  isOnSale: boolean;
  isBestseller: boolean;
  isNew: boolean;
  pricePerKg: number | null;
  effectivePrice: number;
  stockQty: number;
  reservedQty: number;
  alertThreshold: number;
  imageColor: string;
  imageEmoji: string;
  imageUrl?: string | null;
  galleryUrls?: string[];
  isRecommended?: boolean;
  nutrition: string | null;
  variants: ProductVariant[];
  defaultVariantId: string | null;
  aliases: string[];
  supplierName?: string | null;
  relatedProducts?: Product[];
  relatedRecipes?: RecipeSummary[];
}

export interface RecipeSummary {
  id: string;
  slug: string;
  country: string;
  category: string;
  difficulty: string;
  timeMinutes: number;
  baseServings: number;
  imageColor: string;
  imageEmoji: string;
  imageUrl?: string | null;
  isPopular: boolean;
  isNew?: boolean;
  isRecommended?: boolean;
  title: string;
  description: string;
  ingredientsCount?: number;
}

export interface RecipeIngredient {
  id: string;
  productId: string;
  productSku: string;
  productName: string;
  traditionalName: string;
  emoji: string;
  imageUrl?: string | null;
  color: string;
  categoryId: string;
  categorySlug: string | null;
  categoryName: string | null;
  brandName: string | null;
  country: string;
  thermalClass: "AMBIANT" | "REFRIGERATED" | "FROZEN";
  storageType: string;
  packaging: string;
  quantityPerBase: number;
  unit: string;
  role: string;
  optional: boolean;
  alternatives: string[];
  note: string | null;
  defaultVariantId: string | null;
  defaultVariantLabel: string;
  defaultVariantPrice: number;
  defaultVariantWeightGrams: number;
  defaultVariantVolumeMl: number;
  effectivePrice: number;
  stockQty: number;
  variants: ProductVariant[];
}

export interface RecipeDetail {
  id: string;
  slug: string;
  country: string;
  category: string;
  difficulty: string;
  timeMinutes: number;
  baseServings: number;
  imageColor: string;
  imageEmoji: string;
  imageUrl?: string | null;
  galleryUrls?: string[];
  isPopular: boolean;
  isNew?: boolean;
  isRecommended?: boolean;
  title: string;
  description: string;
  steps: string[];
  ingredients: RecipeIngredient[];
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  sortOrder: number;
}

export interface Brand {
  id: string;
  slug: string;
  name: string;
  country: string | null;
}

export interface OrderLine {
  id: string;
  productId: string;
  name: string;
  nameFr: string;
  nameEn: string;
  sku: string;
  unitPrice: number;
  currentUnitPrice?: number;
  qty: number;
  lineTotal: number;
  thermalClass: string;
  recipeId: string | null;
  recipeName: string | null;
  packWeightGrams: number;
  imageUrl?: string | null;
  unitLabel?: string;
  maxStock?: number;
  purchasable?: boolean;
}

export interface OrderEvent {
  id: string;
  status: string;
  label: string;
  at: string;
  actor: string | null;
}

export interface OrderShipment {
  id: string;
  carrierId: string | null;
  carrierName: string | null;
  trackingNumber: string | null;
  thermalClass: string;
  status: string;
  confirmCode: string | null;
  estimatedDelivery: string | null;
  actualDelivery: string | null;
  trackingUrl?: string | null;
  proofPhoto?: string | null;
  signature?: string | null;
}

export interface OrderPayment {
  id: string;
  amount: number;
  method: string;
  status: string;
  reference: string;
}

export interface OrderRefund {
  id: string;
  amount: number;
  reason: string;
  status: string;
}

export interface Order {
  id: string;
  number: string;
  status: string;
  subtotal: number;
  promoDiscount: number;
  vatAmount: number;
  shippingCost: number;
  total: number;
  currency: string;
  weightGrams: number;
  packageCount: number;
  deliveryName: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  deliveryAddress: string | null;
  deliveryCity: string | null;
  deliveryPostalCode: string | null;
  deliveryCountry: string | null;
  deliverySlot: string | null;
  paymentMethod: string | null;
  fraudScore?: number;
  notes?: string | null;
  createdAt: string;
  items: OrderLine[];
  timeline: OrderEvent[];
  shipments: OrderShipment[];
  payments: OrderPayment[];
  refunds?: OrderRefund[];
}

/* Engine response types (mirrors of recipe-engine output) */
export interface IngredientLine {
  ingredientId: string;
  productId: string;
  name: string;
  role: string;
  optional: boolean;
  emoji: string;
  color: string;
  neededQty: number;
  neededUnit: string;
  neededLabel: string;
  boughtQty: number;
  boughtLabel: string;
  packs: number;
  packWeightGrams: number;
  unitLabel: string;
  unitPrice: number;
  lineTotal: number;
  leftover: number;
  leftoverLabel: string;
  available: boolean;
  inStock: number;
  removed: boolean;
  variantId: string;
  thermalClass: string;
  substitute: {
    productId: string;
    name: string;
    emoji: string;
    color: string;
    price: number;
  } | null;
  note?: string | null;
}

export interface RecipeCalculateResult {
  recipe: {
    id: string;
    slug: string;
    title: string;
    description: string;
    country: string;
    category: string;
    difficulty: string;
    timeMinutes: number;
    baseServings: number;
    servings: number;
    imageColor: string;
    imageEmoji: string;
    steps: string[];
  };
  lines: IngredientLine[];
  totals: {
    totalCost: number;
    costPerPerson: number;
    totalWeightGrams: number;
    packsCount: number;
    thermalClasses: string[];
    byThermal: Record<string, { packs: number; weightGrams: number; cost: number }>;
  };
  configEcho: any;
  warnings: string[];
}

/* Search match */
export interface SearchMatch {
  productId: string;
  name: string;
  traditionalName: string;
  emoji: string;
  imageUrl?: string | null;
  color: string;
  price: number;
  packaging: string;
  categorySlug: string | null;
  categoryName: string | null;
  score: number;
  defaultVariantId: string | null;
}

/* Promotion validate */
export interface PromotionValidation {
  valid: boolean;
  reason?: string;
  code?: string;
  type?: "percent" | "fixed" | "free_shipping";
  value?: number;
  discount?: number;
  minOrder?: number;
}

/* Shipping quote */
export interface ShippingQuote {
  fee: number;
  carrierId: string | null;
  carrierName: string | null;
  packages: number;
  minDelayHours?: number;
  note?: string;
}
