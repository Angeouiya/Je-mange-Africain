"use client";

import type { Locale } from "@/lib/i18n";
import { customerProtectedDestination, type ViewId, type ViewParams } from "@/lib/store";
import { prefetchJSON } from "@/lib/use-fetch";

export const STOREFRONT_DATA_TTL_MS = 60_000;
export const STOREFRONT_DETAIL_TTL_MS = 12_000;

export type StorefrontPrefetchTarget = {
  view: ViewId;
  params: ViewParams;
};

export type StorefrontWarmupTarget = StorefrontPrefetchTarget & {
  bundleView: ViewId;
  prefetchData: boolean;
};

const STOREFRONT_FLOW_NEIGHBORS: Record<ViewId, ViewId[]> = {
  home: ["catalog", "recipes", "wholesale", "info"],
  catalog: ["product", "recipes", "wholesale", "cart"],
  wholesale: ["catalog", "cart", "info"],
  product: ["cart", "catalog", "checkout", "recipes"],
  recipes: ["recipe-config", "catalog", "cart"],
  "recipe-config": ["cart", "recipes", "checkout"],
  cart: ["checkout", "catalog", "recipes"],
  checkout: ["cart", "account", "orders"],
  "order-confirmation": ["orders", "order-tracking", "account"],
  orders: ["order-tracking", "account", "catalog"],
  "order-tracking": ["orders", "account", "cart"],
  account: ["orders", "cart", "catalog", "info"],
  info: ["home", "catalog", "recipes"],
};

export function storefrontPrefetchUrls(view: ViewId, params: ViewParams = {}, locale: Locale) {
  switch (view) {
    case "home":
      return [
        `/api/catalog?section=home&locale=${locale}`,
        `/api/advertisements?placement=home&locale=${locale}`,
        "/api/platform",
      ];
    case "catalog": {
      const query = new URLSearchParams({ locale, sort: params.sort || "popular", page: "1", pageSize: "12" });
      if (params.query) query.set("q", params.query);
      if (params.category) query.set("category", params.category);
      return [
        `/api/catalog?${query.toString()}`,
        `/api/advertisements?placement=catalog&locale=${locale}`,
      ];
    }
    case "wholesale":
      return [
        `/api/catalog?channel=wholesale&locale=${locale}&pageSize=48&sort=popular`,
      ];
    case "product":
      return params.productId ? [`/api/products/${encodeURIComponent(params.productId)}?locale=${locale}`] : [];
    case "recipes":
      return [
        `/api/recipes?locale=${locale}`,
        `/api/dishes?locale=${locale}`,
        `/api/advertisements?placement=recipes&locale=${locale}`,
      ];
    case "recipe-config":
      return params.recipeId ? [`/api/recipes/${encodeURIComponent(params.recipeId)}?locale=${locale}`] : [];
    case "checkout":
      return [`/api/advertisements?placement=checkout&locale=${locale}`];
    case "orders":
      return [`/api/orders?locale=${locale}`];
    case "order-tracking":
      return params.orderId ? [`/api/orders/${encodeURIComponent(params.orderId)}?locale=${locale}`] : [];
    case "order-confirmation":
      return params.orderId ? [`/api/orders/${encodeURIComponent(params.orderId)}?locale=${locale}`] : [];
    case "info":
      return ["/api/platform"];
    default:
      return [];
  }
}

export function prefetchStorefrontData(view: ViewId, params: ViewParams = {}, locale: Locale) {
  const ttlMs = view === "product" || view === "recipe-config" ? STOREFRONT_DETAIL_TTL_MS : STOREFRONT_DATA_TTL_MS;
  return Promise.allSettled(
    storefrontPrefetchUrls(view, params, locale).map((url) =>
      prefetchJSON(url, {}, { cache: true, ttlMs }).catch(() => null),
    ),
  );
}

export function storefrontPredictiveTargets(view: ViewId, params: ViewParams = {}) {
  const targets: StorefrontPrefetchTarget[] = [];
  const seen = new Set<string>();
  const add = (targetView: ViewId, targetParams: ViewParams = {}) => {
    const key = `${targetView}:${JSON.stringify(targetParams)}`;
    if (seen.has(key)) return;
    seen.add(key);
    targets.push({ view: targetView, params: targetParams });
  };

  add(view, params);
  for (const nextView of STOREFRONT_FLOW_NEIGHBORS[view]) {
    if (nextView === "product" && params.productId) add(nextView, { productId: params.productId });
    else if (nextView === "recipe-config" && params.recipeId) add(nextView, { recipeId: params.recipeId });
    else if ((nextView === "order-tracking" || nextView === "order-confirmation") && params.orderId) add(nextView, { orderId: params.orderId });
    else add(nextView, {});
  }
  if (view === "recipes" && params.recipeMode !== "library") add("recipes", { recipeMode: "library" });
  if (view === "account" && params.returnView) add(params.returnView, {});

  return targets;
}

export function storefrontWarmupPlan(targets: StorefrontPrefetchTarget[], authenticated: boolean) {
  const plannedTargets: StorefrontWarmupTarget[] = [];
  const seen = new Set<string>();

  for (const target of targets) {
    const protectedDestination = customerProtectedDestination(target.view, target.params);
    const bundleView = !authenticated && protectedDestination ? "account" : target.view;
    const prefetchData = authenticated || !protectedDestination;
    const key = `${target.view}:${JSON.stringify(target.params)}:${bundleView}:${prefetchData}`;
    if (seen.has(key)) continue;
    seen.add(key);
    plannedTargets.push({ ...target, bundleView, prefetchData });
  }

  return plannedTargets;
}
