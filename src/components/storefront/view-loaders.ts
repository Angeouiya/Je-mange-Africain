"use client";

import type { ComponentType } from "react";
import type { ViewId } from "@/lib/store";

export type StorefrontViewLoader = () => Promise<ComponentType>;

export const loadCatalogView: StorefrontViewLoader = () => import("@/components/storefront/views/CatalogView").then((module) => module.CatalogView);
export const loadWholesaleView: StorefrontViewLoader = () => import("@/components/storefront/views/WholesaleView").then((module) => module.WholesaleView);
export const loadProductDetailView: StorefrontViewLoader = () => import("@/components/storefront/views/ProductDetailView").then((module) => module.ProductDetailView);
export const loadRecipesView: StorefrontViewLoader = () => import("@/components/storefront/views/RecipesView").then((module) => module.RecipesView);
export const loadRecipeConfiguratorView: StorefrontViewLoader = () => import("@/components/storefront/views/RecipeConfiguratorView").then((module) => module.RecipeConfiguratorView);
export const loadCartView: StorefrontViewLoader = () => import("@/components/storefront/views/CartView").then((module) => module.CartView);
export const loadCheckoutView: StorefrontViewLoader = () => import("@/components/storefront/views/CheckoutView").then((module) => module.CheckoutView);
export const loadOrderConfirmationView: StorefrontViewLoader = () => import("@/components/storefront/views/OrderConfirmationView").then((module) => module.OrderConfirmationView);
export const loadOrdersView: StorefrontViewLoader = () => import("@/components/storefront/views/OrdersView").then((module) => module.OrdersView);
export const loadOrderTrackingView: StorefrontViewLoader = () => import("@/components/storefront/views/OrderTrackingView").then((module) => module.OrderTrackingView);
export const loadAccountView: StorefrontViewLoader = () => import("@/components/storefront/views/AccountView").then((module) => module.AccountView);
export const loadInfoView: StorefrontViewLoader = () => import("@/components/storefront/views/InfoView").then((module) => module.InfoView);

const VIEW_BUNDLE_LOADERS: Partial<Record<ViewId, StorefrontViewLoader>> = {
  catalog: loadCatalogView,
  wholesale: loadWholesaleView,
  product: loadProductDetailView,
  recipes: loadRecipesView,
  "recipe-config": loadRecipeConfiguratorView,
  cart: loadCartView,
  checkout: loadCheckoutView,
  "order-confirmation": loadOrderConfirmationView,
  orders: loadOrdersView,
  "order-tracking": loadOrderTrackingView,
  account: loadAccountView,
  info: loadInfoView,
};

const preloadedViewBundles = new Set<ViewId>();

export function preloadStorefrontViewBundle(view: ViewId) {
  const loader = VIEW_BUNDLE_LOADERS[view];
  if (!loader || preloadedViewBundles.has(view)) return Promise.resolve();
  preloadedViewBundles.add(view);
  return loader().catch((error) => {
    preloadedViewBundles.delete(view);
    throw error;
  });
}
