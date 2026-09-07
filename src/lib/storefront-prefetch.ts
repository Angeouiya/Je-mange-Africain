"use client";

import type { Locale } from "@/lib/i18n";
import type { ViewId, ViewParams } from "@/lib/store";
import { prefetchJSON } from "@/lib/use-fetch";

export const STOREFRONT_DATA_TTL_MS = 60_000;
export const STOREFRONT_DETAIL_TTL_MS = 12_000;

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
