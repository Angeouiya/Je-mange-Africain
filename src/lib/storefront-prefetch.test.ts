import { describe, expect, it } from "vitest";
import { storefrontPredictiveTargets, storefrontPrefetchUrls, storefrontWarmupPlan } from "./storefront-prefetch";

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

  it("predicts the next mobile shopping steps from each major surface", () => {
    expect(storefrontPredictiveTargets("home").map((target) => target.view)).toEqual(["home", "catalog", "recipes", "wholesale", "info"]);
    expect(storefrontPredictiveTargets("catalog").map((target) => target.view)).toEqual(["catalog", "product", "recipes", "wholesale", "cart"]);
    expect(storefrontPredictiveTargets("cart").map((target) => target.view)).toEqual(["cart", "checkout", "catalog", "recipes"]);
  });

  it("preserves entity context for detail and recipe configurator warmups", () => {
    expect(storefrontPredictiveTargets("product", { productId: "atti-1" })).toContainEqual({ view: "product", params: { productId: "atti-1" } });
    expect(storefrontPredictiveTargets("recipes", { recipeId: "sauce-graine" })).toContainEqual({ view: "recipe-config", params: { recipeId: "sauce-graine" } });
    expect(storefrontPredictiveTargets("order-confirmation", { orderId: "order-42" })).toContainEqual({ view: "order-tracking", params: { orderId: "order-42" } });
  });

  it("warms the auth workspace instead of protected data for anonymous customers", () => {
    expect(storefrontWarmupPlan([{ view: "product", params: { productId: "atti-1" } }], false)).toEqual([
      { view: "product", params: { productId: "atti-1" }, bundleView: "account", prefetchData: false },
    ]);
    expect(storefrontWarmupPlan([{ view: "info", params: { infoPage: "help" } }], false)).toEqual([
      { view: "info", params: { infoPage: "help" }, bundleView: "info", prefetchData: true },
    ]);
  });

  it("warms protected destination bundles and data once the customer is authenticated", () => {
    expect(storefrontWarmupPlan([
      { view: "recipe-config", params: { recipeId: "mafe" } },
      { view: "recipe-config", params: { recipeId: "mafe" } },
    ], true)).toEqual([
      { view: "recipe-config", params: { recipeId: "mafe" }, bundleView: "recipe-config", prefetchData: true },
    ]);
  });
});
