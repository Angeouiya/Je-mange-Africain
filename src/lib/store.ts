"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Locale } from "./i18n";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type ViewId =
  | "home"
  | "catalog"
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
  qty: number;
  recipeId?: string; // if part of a recipe basket
  recipeName?: string;
  maxStock: number; // available stock snapshot
}

export interface ViewParams {
  productId?: string;
  recipeId?: string;
  orderId?: string;
  category?: string;
  query?: string;
  recipeMode?: "recipes" | "library";
  accountSection?: "profile" | "saved" | "settings";
  infoPage?: "about" | "help" | "contact" | "cgv" | "privacy" | "cookies" | "delivery";
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
}

/* ------------------------------------------------------------------ */
/* Store                                                               */
/* ------------------------------------------------------------------ */

interface AppState {
  // i18n
  locale: Locale;
  setLocale: (l: Locale) => void;

  // navigation
  view: ViewId;
  params: ViewParams;
  navigate: (view: ViewId, params?: ViewParams) => void;

  // delivery context
  country: string;
  postalCode: string;
  setDeliveryContext: (country: string, postalCode: string) => void;

  // cart
  cart: CartItem[];
  addToCart: (item: Omit<CartItem, "id" | "qty"> & { qty?: number }) => void;
  addManyToCart: (items: (Omit<CartItem, "id" | "qty"> & { qty?: number })[]) => void;
  updateQty: (lineId: string, qty: number) => void;
  removeLine: (lineId: string) => void;
  clearCart: () => void;
  coupon: string | null;
  setCoupon: (c: string | null) => void;

  // favorites
  favorites: string[];
  toggleFavorite: (productId: string) => void;

  // saved recipes
  savedRecipes: string[];
  toggleSavedRecipe: (recipeId: string) => void;

  // recently viewed
  recentlyViewed: string[];
  pushRecentlyViewed: (productId: string) => void;

  // customer session
  customer: Customer | null;
  setCustomer: (customer: Customer | null) => void;
  logout: () => void;

  // addresses
  addresses: Address[];
  addAddress: (a: Omit<Address, "id">) => void;

  // toast notification helper (resolved on mount)
  _hydrated: boolean;
  setHydrated: (v: boolean) => void;
}

const uid = () => Math.random().toString(36).slice(2, 10);

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      locale: "fr",
      setLocale: (l) => set({ locale: l }),

      view: "home",
      params: {},
      navigate: (view, params = {}) => {
        set({ view, params });
        if (typeof window !== "undefined") {
          window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
        }
      },

      country: "France",
      postalCode: "75011",
      setDeliveryContext: (country, postalCode) => set({ country, postalCode }),

      cart: [],
      addToCart: (item) =>
        set((s) => {
          const qty = item.qty ?? 1;
          // merge if same product + same recipe group
          const idx = s.cart.findIndex(
            (c) =>
              c.productId === item.productId &&
              c.variantId === item.variantId &&
              c.recipeId === item.recipeId
          );
          if (idx >= 0) {
            const next = [...s.cart];
            next[idx] = { ...next[idx], qty: Math.min(next[idx].qty + qty, next[idx].maxStock || 99) };
            return { cart: next };
          }
          return { cart: [...s.cart, { ...item, id: uid(), qty }] };
        }),
      addManyToCart: (items) =>
        set((s) => {
          let cart = [...s.cart];
          for (const it of items) {
            const qty = it.qty ?? 1;
            const idx = cart.findIndex(
              (c) =>
                c.productId === it.productId &&
                c.variantId === it.variantId &&
                c.recipeId === it.recipeId
            );
            if (idx >= 0) {
              cart[idx] = { ...cart[idx], qty: Math.min(cart[idx].qty + qty, cart[idx].maxStock || 99) };
            } else {
              cart = [...cart, { ...it, id: uid(), qty }];
            }
          }
          return { cart };
        }),
      updateQty: (lineId, qty) =>
        set((s) => ({
          cart: s.cart
            .map((c) => (c.id === lineId ? { ...c, qty: Math.max(0, qty) } : c))
            .filter((c) => c.qty > 0),
        })),
      removeLine: (lineId) => set((s) => ({ cart: s.cart.filter((c) => c.id !== lineId) })),
      clearCart: () => set({ cart: [], coupon: null }),
      coupon: null,
      setCoupon: (c) => set({ coupon: c }),

      favorites: [],
      toggleFavorite: (productId) =>
        set((s) => ({
          favorites: s.favorites.includes(productId)
            ? s.favorites.filter((f) => f !== productId)
            : [...s.favorites, productId],
        })),

      savedRecipes: [],
      toggleSavedRecipe: (recipeId) =>
        set((s) => ({
          savedRecipes: s.savedRecipes.includes(recipeId)
            ? s.savedRecipes.filter((r) => r !== recipeId)
            : [...s.savedRecipes, recipeId],
        })),

      recentlyViewed: [],
      pushRecentlyViewed: (productId) =>
        set((s) => ({
          recentlyViewed: [productId, ...s.recentlyViewed.filter((p) => p !== productId)].slice(0, 12),
        })),

      customer: null,
      setCustomer: (customer) => set({ customer }),
      logout: () => set({ customer: null }),

      addresses: [
        {
          id: "addr-1",
          label: "Domicile",
          firstName: "Awa",
          lastName: "Traoré",
          street: "12 rue de la Gare",
          postalCode: "75011",
          city: "Paris",
          country: "France",
          phone: "+33 6 12 34 56 78",
        },
      ],
      addAddress: (a) => set((s) => ({ addresses: [...s.addresses, { ...a, id: uid() }] })),

      _hydrated: false,
      setHydrated: (v) => set({ _hydrated: v }),
    }),
    {
      name: "jma-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        locale: s.locale,
        cart: s.cart,
        favorites: s.favorites,
        savedRecipes: s.savedRecipes,
        recentlyViewed: s.recentlyViewed,
        customer: s.customer,
        addresses: s.addresses,
        country: s.country,
        postalCode: s.postalCode,
        coupon: s.coupon,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);

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
