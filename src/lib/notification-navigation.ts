import type { ViewId, ViewParams } from "./store";

const VALID_VIEWS = new Set<ViewId>(["home", "catalog", "product", "recipes", "recipe-config", "cart", "checkout", "order-confirmation", "orders", "order-tracking", "account", "info"]);

export type NotificationDateBucket = "today" | "yesterday" | "earlier";

function localDayOrdinal(value: Date) {
  return Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()) / 86_400_000;
}

export function notificationDateBucket(createdAt: string | Date, now: string | Date = new Date()): NotificationDateBucket {
  const created = createdAt instanceof Date ? createdAt : new Date(createdAt);
  const reference = now instanceof Date ? now : new Date(now);
  if (Number.isNaN(created.getTime()) || Number.isNaN(reference.getTime())) return "earlier";
  const elapsedDays = localDayOrdinal(reference) - localDayOrdinal(created);
  if (elapsedDays <= 0) return "today";
  return elapsedDays === 1 ? "yesterday" : "earlier";
}

export function groupNotificationsByDay<T extends { createdAt: string }>(notifications: T[], now: string | Date = new Date()) {
  const grouped: Record<NotificationDateBucket, T[]> = { today: [], yesterday: [], earlier: [] };
  notifications.forEach((notification) => grouped[notificationDateBucket(notification.createdAt, now)].push(notification));
  return (["today", "yesterday", "earlier"] as const).flatMap((key) => grouped[key].length ? [{ key, notifications: grouped[key] }] : []);
}

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
