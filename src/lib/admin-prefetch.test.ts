import { describe, expect, it } from "vitest";
import { adminPrefetchUrls } from "./admin-prefetch";

describe("admin prefetch map", () => {
  it("matches the first requests emitted by primary professional workspaces", () => {
    expect(adminPrefetchUrls("overview", "fr")).toEqual(["/api/admin/dashboard?locale=fr"]);
    expect(adminPrefetchUrls("catalog", "fr")).toEqual(["/api/admin/products?locale=fr"]);
    expect(adminPrefetchUrls("recipes", "en")).toEqual(["/api/admin/recipes?locale=en", "/api/admin/products?locale=en"]);
    expect(adminPrefetchUrls("orders", "fr")).toEqual(["/api/orders?locale=fr"]);
  });

  it("preloads heavy operational ledgers with exact default filters", () => {
    expect(adminPrefetchUrls("finance", "fr")).toEqual([
      "/api/admin/profitability?locale=fr&period=30d",
      "/api/admin/payments?locale=fr&period=30d&filter=all&query=&page=1&pageSize=24",
    ]);
    expect(adminPrefetchUrls("governance", "en")).toEqual(["/api/admin/audit?locale=en&period=30d"]);
  });

  it("warms settings and marketing surfaces without exposing secret values", () => {
    expect(adminPrefetchUrls("settings", "fr")).toEqual(["/api/admin/settings"]);
    expect(adminPrefetchUrls("promotions", "fr")).toEqual(["/api/admin/promotions", "/api/admin/products", "/api/categories"]);
    expect(adminPrefetchUrls("campaigns", "fr")).toEqual(["/api/admin/push?type=system"]);
  });
});
