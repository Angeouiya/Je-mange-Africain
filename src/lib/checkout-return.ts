export const PENDING_CHECKOUT_STORAGE_KEY = "jma-pending-checkout-v1";
export const PENDING_CHECKOUT_MAX_AGE_MS = 2 * 60 * 60 * 1_000;

export type PendingCheckoutPayload = {
  items: Array<{
    productId: string;
    variantId?: string;
    qty: number;
    recipeId?: string;
    recipeNameFr?: string;
    recipeNameEn?: string;
    salesChannel?: "retail" | "wholesale";
  }>;
  address: {
    firstName: string;
    lastName: string;
    email: string;
    street: string;
    postalCode: string;
    city: string;
    country: string;
    phone: string;
  };
  deliverySlot: "standard" | "express" | "relay";
  coupon: string | null;
  locale: "fr" | "en";
};

type PendingCheckoutState = {
  version: 1;
  paymentIntentId: string;
  createdAt: number;
  payload: PendingCheckoutPayload;
};

type CheckoutStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function rememberPendingCheckout(paymentIntentId: string, payload: PendingCheckoutPayload, storage = browserSessionStorage()) {
  if (!storage) return false;
  try {
    const state: PendingCheckoutState = { version: 1, paymentIntentId, createdAt: Date.now(), payload };
    storage.setItem(PENDING_CHECKOUT_STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function readPendingCheckout(paymentIntentId: string, storage = browserSessionStorage(), now = Date.now()) {
  if (!storage) return null;
  try {
    const raw = storage.getItem(PENDING_CHECKOUT_STORAGE_KEY);
    if (!raw) return null;
    const state = JSON.parse(raw) as Partial<PendingCheckoutState>;
    const valid = state.version === 1
      && state.paymentIntentId === paymentIntentId
      && typeof state.createdAt === "number"
      && now - state.createdAt <= PENDING_CHECKOUT_MAX_AGE_MS
      && now >= state.createdAt
      && isPendingCheckoutPayload(state.payload);
    if (!valid) {
      storage.removeItem(PENDING_CHECKOUT_STORAGE_KEY);
      return null;
    }
    return state.payload;
  } catch {
    storage.removeItem(PENDING_CHECKOUT_STORAGE_KEY);
    return null;
  }
}

export function clearPendingCheckout(storage = browserSessionStorage()) {
  try {
    storage?.removeItem(PENDING_CHECKOUT_STORAGE_KEY);
  } catch {
    // Storage can be unavailable in restricted browser contexts.
  }
}

function browserSessionStorage(): CheckoutStorage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

function isPendingCheckoutPayload(value: unknown): value is PendingCheckoutPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<PendingCheckoutPayload>;
  if (!Array.isArray(payload.items) || !payload.items.length) return false;
  if (!payload.address || typeof payload.address !== "object") return false;
  if (!(["standard", "express", "relay"] as const).includes(payload.deliverySlot as PendingCheckoutPayload["deliverySlot"])) return false;
  if (!(["fr", "en"] as const).includes(payload.locale as PendingCheckoutPayload["locale"])) return false;
  const address = payload.address as Partial<PendingCheckoutPayload["address"]>;
  return payload.items.every((item) => Boolean(
    item
    && typeof item.productId === "string"
    && (item.variantId === undefined || typeof item.variantId === "string")
    && Number.isInteger(item.qty)
    && item.qty > 0
  ))
    && [address.firstName, address.lastName, address.email, address.street, address.postalCode, address.city, address.country, address.phone].every((field) => typeof field === "string" && field.length > 0);
}
