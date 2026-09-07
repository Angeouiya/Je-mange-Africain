import { describe, expect, it } from "vitest";
import { storefrontPrefetchUrls } from "./storefront-prefetch";

describe("storefront prefetch map", () => {
  it("matches the first catalogue request emitted by the public catalogue view", () => {
    expect(storefrontPrefetchUrls("catalog", {}, "fr")).toContain("/api/catalog?locale=fr&sort=popular&page=1&pageSize=12");
  });

  it("prepares detail URLs only when an entity id exists", () => {
    expect(storefrontPrefetchUrls("product", { productId: "prod 1" }, "en")).toEqual(["/api/products/prod%201?locale=en"]);
    expect(storefrontPrefetchUrls("recipe-config", {}, "fr")).toEqual([]);
  });

  it("warms the public home, recipe and platform surfaces without account mutations", () => {
    expect(storefrontPrefetchUrls("home", {}, "fr")).toEqual([
      "/api/catalog?section=home&locale=fr",
      "/api/advertisements?placement=home&locale=fr",
      "/api/platform",
    ]);
    expect(storefrontPrefetchUrls("recipes", {}, "en")).toEqual([
      "/api/recipes?locale=en",
      "/api/dishes?locale=en",
      "/api/advertisements?placement=recipes&locale=en",
    ]);
    expect(storefrontPrefetchUrls("account", {}, "fr")).toEqual([]);
  });

  it("prepares authenticated order workspaces when the navigation already has context", () => {
    expect(storefrontPrefetchUrls("orders", {}, "fr")).toEqual(["/api/orders?locale=fr"]);
    expect(storefrontPrefetchUrls("order-tracking", { orderId: "order 1" }, "en")).toEqual(["/api/orders/order%201?locale=en"]);
    expect(storefrontPrefetchUrls("order-confirmation", {}, "fr")).toEqual([]);
  });
});
