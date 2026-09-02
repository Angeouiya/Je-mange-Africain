import type { ViewId, ViewParams } from "./store";

const VALID_VIEWS = new Set<ViewId>(["home", "catalog", "product", "recipes", "recipe-config", "cart", "checkout", "order-confirmation", "orders", "order-tracking", "account", "info"]);

export function parseNotificationDestination(url: string): { view: ViewId; params?: ViewParams } | null {
  try {
    const applicationOrigin = "https://je-mange-africain.com";
    const target = new URL(url, applicationOrigin);
    if (target.origin !== applicationOrigin || target.pathname !== "/") return null;
    const requestedView = target.searchParams.get("view") || "home";
    if (!VALID_VIEWS.has(requestedView as ViewId)) return null;
    const params: ViewParams = {};
    const productId = target.searchParams.get("productId");
    const recipeId = target.searchParams.get("recipeId");
    const orderId = target.searchParams.get("orderId");
    const query = target.searchParams.get("query");
    const recipeMode = target.searchParams.get("recipeMode");
    if (productId) params.productId = productId;
    if (recipeId) params.recipeId = recipeId;
    if (orderId) params.orderId = orderId;
    if (query) params.query = query;
    if (recipeMode === "recipes" || recipeMode === "library") params.recipeMode = recipeMode;
    return { view: requestedView as ViewId, ...(Object.keys(params).length ? { params } : {}) };
  } catch {
    return null;
  }
}
