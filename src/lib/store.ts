"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Locale } from "./i18n";
import { reconcileSavedLibrary } from "./saved-library";
import { wholesalePriceForQuantity, type WholesaleTier } from "./wholesale";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type ViewId =
  | "home"
  | "catalog"
  | "wholesale"
  | "product"
  | "recipes"
  | "recipe-config"
  | "cart"
  | "checkout"
  | "order-confirmation"
  | "orders"
  | "order-tracking"
  | "account"
  | "info";

export type ThermalClass = "AMBIANT" | "REFRIGERATED" | "FROZEN";
export type ContactReason = "order" | "delivery" | "product" | "recipe" | "wholesale" | "other";

export interface CartItem {
  id: string; // line id
  productId: string;
  variantId?: string;
  name: string; // localized snapshot (current locale) for quick render
  nameEn: string;
  nameFr: string;
  unitPrice: number; // current price snapshot
  unitLabel: string; // e.g. "400 g"
  packWeightGrams: number; // weight of one pack in grams
  thermalClass: ThermalClass;
  imageColor?: string; // tailwind gradient seed
  imageEmoji?: string; // emoji snapshot for cart display
  imageUrl?: string; // real product photo snapshot for cart and reorder display
  qty: number;
  recipeId?: string; // if part of a recipe basket
  recipeName?: string;
  maxStock: number; // available stock snapshot
  salesChannel?: "retail" | "wholesale";
  minimumQty?: number;
  unitsPerPack?: number;
  wholesaleTiers?: WholesaleTier[];
}

export interface ViewParams {
  productId?: string;
  recipeId?: string;
  orderId?: string;
  category?: string;
  query?: string;
  sort?: "popular" | "priceAsc" | "priceDesc" | "new" | "available";
  recipeMode?: "recipes" | "library";
  accountSection?: "profile" | "addresses" | "quotes" | "saved" | "settings";
  returnView?: ViewId;
  infoPage?: "about" | "help" | "contact" | "cgv" | "privacy" | "cookies" | "delivery";
  contactReason?: ContactReason;
}

export interface AuthReturnTarget {
  view: ViewId;
  params: ViewParams;
}

export interface Address {
  id: string;
  label: string;
  firstName: string;
  lastName: string;
  street: string;
  postalCode: string;
  city: string;
  country: string;
  phone?: string;
  isDefault?: boolean;
}

export interface Customer {
  id: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  role: "customer";
  loyaltyPoints: number;
  walletCredit: number;
  preferredLang?: Locale;
}

export type SavedSyncStatus = "idle" | "syncing" | "synced" | "error";

/* ------------------------------------------------------------------ */
/* Store                                                               */
/* ------------------------------------------------------------------ */

export interface AppState {
  // i18n
  locale: Locale;
  setLocale: (l: Locale) => void;

  // navigation
  view: ViewId;
  params: ViewParams;
  navigationHistory: { view: ViewId; params: ViewParams }[];
  navigate: (view: ViewId, params?: ViewParams) => void;
  goBack: (fallbackView?: ViewId, fallbackParams?: ViewParams) => void;
  authReturnTarget: AuthReturnTarget | null;
  requestCustomerAuth: (target?: AuthReturnTarget) => boolean;
  consumeAuthReturnTarget: () => AuthReturnTarget | null;

  // delivery context
  country: string;
  postalCode: string;
  setDeliveryContext: (country: string, postalCode: string) => void;

  // cart
  cart: CartItem[];
  addToCart: (item: Omit<CartItem, "id" | "qty"> & { qty?: number }) => boolean;
  addManyToCart: (items: (Omit<CartItem, "id" | "qty"> & { qty?: number })[]) => boolean;
  updateQty: (lineId: string, qty: number) => boolean;
  removeLine: (lineId: string) => boolean;
  clearCart: () => boolean;
  coupon: string | null;
  setCoupon: (c: string | null) => boolean;

  // favorites
  favorites: string[];
  toggleFavorite: (productId: string) => boolean;

  // saved recipes
  savedRecipes: string[];
  toggleSavedRecipe: (recipeId: string) => boolean;
  savedSyncStatus: SavedSyncStatus;
  savedOwnerId: string | null;
  mergeSavedItems: (productIds: string[], recipeIds: string[]) => void;
  syncSavedItems: () => Promise<boolean>;

  // recently viewed
  recentlyViewed: string[];
  pushRecentlyViewed: (productId: string) => void;

  // customer session
  customer: Customer | null;
  setCustomer: (customer: Customer | null) => void;
  logout: () => void;

  // addresses
  addresses: Address[];
  setAddresses: (addresses: Address[]) => void;

  // client hydration state
  _hydrated: boolean;
  setHydrated: (v: boolean) => void;
}

const uid = () => Math.random().toString(36).slice(2, 10);
let savedSyncTimer: ReturnType<typeof setTimeout> | null = null;
let savedStateRevision = 0;

const CUSTOMER_PROTECTED_VIEWS = new Set<ViewId>([
  "catalog",
  "wholesale",
  "product",
  "recipes",
  "recipe-config",
  "cart",
  "checkout",
  "order-confirmation",
  "orders",
  "order-tracking",
]);

type PersistedClientState = Partial<Pick<AppState,
  | "locale"
  | "cart"
  | "favorites"
  | "savedRecipes"
  | "savedOwnerId"
  | "recentlyViewed"
  | "country"
  | "postalCode"
  | "coupon"
>>;

export function customerProtectedView(view: ViewId) {
  return CUSTOMER_PROTECTED_VIEWS.has(view);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function stringArrayOrFallback(value: unknown, fallback: string[]) {
  return Array.isArray(value) && value.every((item) => typeof item === "string") ? value : fallback;
}

export function mergeCustomerSafePersistedState(persistedState: unknown, currentState: AppState): AppState {
  const persisted = (isRecord(persistedState) ? persistedState : {}) as PersistedClientState;
  return {
    ...currentState,
    locale: persisted.locale === "fr" || persisted.locale === "en" ? persisted.locale : currentState.locale,
    cart: Array.isArray(persisted.cart) ? persisted.cart : currentState.cart,
    favorites: stringArrayOrFallback(persisted.favorites, currentState.favorites),
    savedRecipes: stringArrayOrFallback(persisted.savedRecipes, currentState.savedRecipes),
    savedOwnerId: typeof persisted.savedOwnerId === "string" ? persisted.savedOwnerId : null,
    recentlyViewed: stringArrayOrFallback(persisted.recentlyViewed, currentState.recentlyViewed),
    country: typeof persisted.country === "string" ? persisted.country : currentState.country,
    postalCode: typeof persisted.postalCode === "string" ? persisted.postalCode : currentState.postalCode,
    coupon: typeof persisted.coupon === "string" ? persisted.coupon : null,
    customer: null,
    addresses: [],
  };
}

function sanitizedAuthReturnTarget(view: ViewId, params: ViewParams = {}): AuthReturnTarget {
  if (view === "account") return { view: "home", params: {} };
  return { view, params };
}

export function publicFallbackForAuthTarget(target: AuthReturnTarget | null | undefined): AuthReturnTarget {
  if (!target || target.view === "account") return { view: "home", params: {} };
  if (target.view === "info" && target.params.infoPage === "contact") return { view: "home", params: {} };
  if (!customerProtectedView(target.view)) return target;
  return { view: "home", params: {} };
}

function scrollToTopInstantly() {
  if (typeof window !== "undefined") {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      locale: "fr",
      setLocale: (l) => set({ locale: l }),

      view: "home",
      params: {},
      navigationHistory: [],
      navigate: (view, params = {}) => {
        set((state) => {
          const protectedTarget = !state.customer && customerProtectedView(view);
          const guardedReturnTarget = protectedTarget ? sanitizedAuthReturnTarget(view, params) : null;
          const authReturnTarget = guardedReturnTarget || state.authReturnTarget;
          const nextView = protectedTarget ? "account" : view;
          const nextParams = guardedReturnTarget ? { returnView: guardedReturnTarget.view } : params;
          const isSameDestination = state.view === nextView && JSON.stringify(state.params) === JSON.stringify(nextParams);
          if (isSameDestination) return state;
          return {
            view: nextView,
            params: nextParams,
            authReturnTarget,
            navigationHistory: [...state.navigationHistory, { view: state.view, params: state.params }].slice(-30),
          };
        });
        scrollToTopInstantly();
      },
      goBack: (fallbackView = "home", fallbackParams = {}) => {
        const state = get();
        const previous = state.navigationHistory.at(-1);
        set({
          view: previous?.view || fallbackView,
          params: previous?.params || fallbackParams,
          navigationHistory: previous ? state.navigationHistory.slice(0, -1) : [],
        });
        scrollToTopInstantly();
      },
      authReturnTarget: null,
      requestCustomerAuth: (target) => {
        const state = get();
        if (state.customer) return true;
        const authReturnTarget = target || sanitizedAuthReturnTarget(state.view, state.params);
        set({
          view: "account",
          params: { returnView: authReturnTarget.view },
          authReturnTarget,
          navigationHistory: [...state.navigationHistory, { view: state.view, params: state.params }].slice(-30),
        });
        scrollToTopInstantly();
        return false;
      },
      consumeAuthReturnTarget: () => {
        const target = get().authReturnTarget;
        set({ authReturnTarget: null });
        return target;
      },

      country: "France",
      postalCode: "75011",
      setDeliveryContext: (country, postalCode) => set({ country, postalCode }),

      cart: [],
      addToCart: (item) => {
        if (!get().requestCustomerAuth()) return false;
        set((s) => {
          const qty = item.qty ?? 1;
          // merge if same product + same recipe group
          const idx = s.cart.findIndex(
            (c) =>
              c.productId === item.productId &&
              c.variantId === item.variantId &&
              (c.salesChannel || "retail") === (item.salesChannel || "retail") &&
              c.recipeId === item.recipeId
          );
          if (idx >= 0) {
            const next = [...s.cart];
            const mergedQty = Math.min(next[idx].qty + qty, next[idx].maxStock || 99);
            const unitPrice = next[idx].salesChannel === "wholesale" && next[idx].wholesaleTiers?.length
              ? wholesalePriceForQuantity(next[idx].wholesaleTiers!, mergedQty)
              : next[idx].unitPrice;
            next[idx] = { ...next[idx], qty: mergedQty, unitPrice };
            return { cart: next };
          }
          return { cart: [...s.cart, { ...item, id: uid(), qty }] };
        });
        return true;
      },
      addManyToCart: (items) => {
        if (!get().requestCustomerAuth()) return false;
        set((s) => {
          let cart = [...s.cart];
          for (const it of items) {
            const qty = it.qty ?? 1;
            const idx = cart.findIndex(
              (c) =>
                c.productId === it.productId &&
                c.variantId === it.variantId &&
                (c.salesChannel || "retail") === (it.salesChannel || "retail") &&
                c.recipeId === it.recipeId
            );
            if (idx >= 0) {
              const mergedQty = Math.min(cart[idx].qty + qty, cart[idx].maxStock || 99);
              const unitPrice = cart[idx].salesChannel === "wholesale" && cart[idx].wholesaleTiers?.length
                ? wholesalePriceForQuantity(cart[idx].wholesaleTiers!, mergedQty)
                : cart[idx].unitPrice;
              cart[idx] = { ...cart[idx], qty: mergedQty, unitPrice };
            } else {
              cart = [...cart, { ...it, id: uid(), qty }];
            }
          }
          return { cart };
        });
        return true;
      },
      updateQty: (lineId, qty) => {
        if (!get().requestCustomerAuth({ view: "cart", params: {} })) return false;
        set((s) => ({
          cart: s.cart
            .map((c) => {
              if (c.id !== lineId) return c;
              const nextQty = c.salesChannel === "wholesale" ? Math.max(c.minimumQty || 1, qty) : Math.max(0, qty);
              const unitPrice = c.salesChannel === "wholesale" && c.wholesaleTiers?.length
                ? wholesalePriceForQuantity(c.wholesaleTiers, nextQty)
                : c.unitPrice;
              return { ...c, qty: nextQty, unitPrice };
            })
            .filter((c) => c.qty > 0),
        }));
        return true;
      },
      removeLine: (lineId) => {
        if (!get().requestCustomerAuth({ view: "cart", params: {} })) return false;
        set((s) => ({ cart: s.cart.filter((c) => c.id !== lineId) }));
        return true;
      },
      clearCart: () => {
        if (!get().requestCustomerAuth({ view: "cart", params: {} })) return false;
        set({ cart: [], coupon: null });
        return true;
      },
      coupon: null,
      setCoupon: (c) => {
        if (!get().requestCustomerAuth({ view: "cart", params: {} })) return false;
        set({ coupon: c });
        return true;
      },

      favorites: [],
      toggleFavorite: (productId) => {
        if (!get().requestCustomerAuth()) return false;
        savedStateRevision += 1;
        set((s) => ({
          favorites: s.favorites.includes(productId)
            ? s.favorites.filter((f) => f !== productId)
            : [...s.favorites, productId],
          savedSyncStatus: s.customer ? "syncing" : "idle",
        }));
        scheduleSavedSync(() => get().syncSavedItems(), Boolean(get().customer));
        return true;
      },

      savedRecipes: [],
      toggleSavedRecipe: (recipeId) => {
        if (!get().requestCustomerAuth()) return false;
        savedStateRevision += 1;
        set((s) => ({
          savedRecipes: s.savedRecipes.includes(recipeId)
            ? s.savedRecipes.filter((r) => r !== recipeId)
            : [...s.savedRecipes, recipeId],
          savedSyncStatus: s.customer ? "syncing" : "idle",
        }));
        scheduleSavedSync(() => get().syncSavedItems(), Boolean(get().customer));
        return true;
      },
      savedSyncStatus: "idle",
      savedOwnerId: null,
      mergeSavedItems: (productIds, recipeIds) => {
        const current = get();
        const ownedByCurrentCustomer = Boolean(current.customer && current.savedOwnerId === current.customer.id);
        const preservePendingChanges = ownedByCurrentCustomer && current.savedSyncStatus === "syncing";
        const reconciled = reconcileSavedLibrary({
          remote: { productIds, recipeIds },
          local: { productIds: current.favorites, recipeIds: current.savedRecipes },
          ownedByCurrentCustomer,
          preservePendingChanges,
        });
        const favorites = reconciled.productIds;
        const savedRecipes = reconciled.recipeIds;
        const changed = favorites.join("\0") !== current.favorites.join("\0") || savedRecipes.join("\0") !== current.savedRecipes.join("\0");
        const needsServerSync = reconciled.needsServerSync;
        if (changed) savedStateRevision += 1;
        set({
          favorites,
          savedRecipes,
          savedOwnerId: current.customer && !needsServerSync ? current.customer.id : current.savedOwnerId,
          savedSyncStatus: current.customer ? (needsServerSync ? "syncing" : "synced") : "idle",
        });
        scheduleSavedSync(() => get().syncSavedItems(), Boolean(current.customer && needsServerSync));
      },
      syncSavedItems: async () => {
        const state = get();
        if (!state.customer || typeof window === "undefined") {
          set({ savedSyncStatus: "idle" });
          return false;
        }
        const revision = savedStateRevision;
        set({ savedSyncStatus: "syncing" });
        try {
          const response = await fetch("/api/customer/saved", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productIds: state.favorites, recipeIds: state.savedRecipes }),
            signal: AbortSignal.timeout(6_000),
          });
          const payload = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
          if (revision === savedStateRevision) {
            set({
              favorites: Array.isArray(payload.productIds) ? payload.productIds : state.favorites,
              savedRecipes: Array.isArray(payload.recipeIds) ? payload.recipeIds : state.savedRecipes,
              savedOwnerId: state.customer.id,
              savedSyncStatus: "synced",
            });
          }
          return true;
        } catch {
          if (revision === savedStateRevision) set({ savedSyncStatus: "error" });
          return false;
        }
      },

      recentlyViewed: [],
      pushRecentlyViewed: (productId) => {
        if (!get().customer) return;
        set((s) => ({
          recentlyViewed: [productId, ...s.recentlyViewed.filter((p) => p !== productId)].slice(0, 12),
        }));
      },

      customer: null,
      setCustomer: (customer) => {
        if (customer) {
          set({ customer });
          return;
        }
        if (savedSyncTimer) clearTimeout(savedSyncTimer);
        savedSyncTimer = null;
        savedStateRevision += 1;
        set({ customer: null, addresses: [], cart: [], coupon: null, favorites: [], savedRecipes: [], recentlyViewed: [], savedOwnerId: null, savedSyncStatus: "idle" });
      },
      logout: () => {
        if (savedSyncTimer) clearTimeout(savedSyncTimer);
        savedSyncTimer = null;
        savedStateRevision += 1;
        set({ customer: null, addresses: [], cart: [], coupon: null, favorites: [], savedRecipes: [], recentlyViewed: [], savedOwnerId: null, savedSyncStatus: "idle", authReturnTarget: null });
      },

      addresses: [],
      setAddresses: (addresses) => set({ addresses }),

      _hydrated: false,
      setHydrated: (v) => set({ _hydrated: v }),
    }),
    {
      name: "jma-store",
      skipHydration: true,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        locale: s.locale,
        cart: s.cart,
        favorites: s.favorites,
        savedRecipes: s.savedRecipes,
        savedOwnerId: s.savedOwnerId,
        recentlyViewed: s.recentlyViewed,
        country: s.country,
        postalCode: s.postalCode,
        coupon: s.coupon,
      }),
      merge: mergeCustomerSafePersistedState,
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);

let storeHydrationPromise: Promise<void> | null = null;

export function hydrateStore() {
  if (useStore.persist.hasHydrated()) return Promise.resolve();
  if (!storeHydrationPromise) {
    storeHydrationPromise = Promise.resolve(useStore.persist.rehydrate());
  }
  return storeHydrationPromise;
}

/* ------------------------------------------------------------------ */
/* Selectors / helpers                                                 */
/* ------------------------------------------------------------------ */

export const cartCount = (cart: CartItem[]) => cart.reduce((n, c) => n + c.qty, 0);

export const cartSubtotal = (cart: CartItem[]) =>
  cart.reduce((sum, c) => sum + c.unitPrice * c.qty, 0);

export const cartWeightGrams = (cart: CartItem[]) =>
  cart.reduce((sum, c) => sum + c.packWeightGrams * c.qty, 0);

export const cartThermalSplit = (cart: CartItem[]) => {
  const set = new Set<ThermalClass>();
  cart.forEach((c) => set.add(c.thermalClass));
  return Array.from(set);
};

function scheduleSavedSync(sync: () => Promise<boolean>, enabled: boolean) {
  if (!enabled || typeof window === "undefined") return;
  if (savedSyncTimer) clearTimeout(savedSyncTimer);
  savedSyncTimer = setTimeout(() => {
    savedSyncTimer = null;
    void sync();
  }, 450);
}
