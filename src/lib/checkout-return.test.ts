import { describe, expect, it } from "vitest";
import {
  PENDING_CHECKOUT_MAX_AGE_MS,
  PENDING_CHECKOUT_STORAGE_KEY,
  clearPendingCheckout,
  readPendingCheckout,
  rememberPendingCheckout,
  type PendingCheckoutPayload,
} from "./checkout-return";

const payload: PendingCheckoutPayload = {
  items: [{ productId: "product-1", variantId: "variant-800", qty: 2, salesChannel: "retail" }],
  address: {
    firstName: "Awa",
    lastName: "Traoré",
    email: "awa@example.fr",
    street: "12 rue des Cultures",
    postalCode: "75011",
    city: "Paris",
    country: "France",
    phone: "+33612345678",
  },
  deliverySlot: "standard",
  coupon: null,
  locale: "fr",
};

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

describe("redirected checkout recovery", () => {
  it("keeps the exact order payload for a matching payment return", () => {
    const storage = memoryStorage();
    expect(rememberPendingCheckout("pi_checkout", payload, storage)).toBe(true);
    expect(readPendingCheckout("pi_checkout", storage)).toEqual(payload);
  });

  it("rejects another intent and clears stale checkout data", () => {
    const storage = memoryStorage();
    rememberPendingCheckout("pi_checkout", payload, storage);
    expect(readPendingCheckout("pi_other", storage)).toBeNull();
    expect(storage.getItem(PENDING_CHECKOUT_STORAGE_KEY)).toBeNull();
  });

  it("expires redirect data and can clear it after finalisation", () => {
    const storage = memoryStorage();
    rememberPendingCheckout("pi_checkout", payload, storage);
    const state = JSON.parse(storage.getItem(PENDING_CHECKOUT_STORAGE_KEY) || "{}") as { createdAt: number };
    expect(readPendingCheckout("pi_checkout", storage, state.createdAt + PENDING_CHECKOUT_MAX_AGE_MS + 1)).toBeNull();
    rememberPendingCheckout("pi_checkout", payload, storage);
    clearPendingCheckout(storage);
    expect(storage.getItem(PENDING_CHECKOUT_STORAGE_KEY)).toBeNull();
  });
});
