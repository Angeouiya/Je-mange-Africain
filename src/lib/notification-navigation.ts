import type { ContactReason, ViewId, ViewParams } from "./store";

const VALID_VIEWS = new Set<ViewId>(["home", "catalog", "wholesale", "product", "recipes", "recipe-config", "cart", "checkout", "order-confirmation", "orders", "order-tracking", "account", "info"]);
const VALID_SORTS = new Set<NonNullable<ViewParams["sort"]>>(["popular", "priceAsc", "priceDesc", "new", "available"]);
const VALID_RECIPE_MODES = new Set<NonNullable<ViewParams["recipeMode"]>>(["recipes", "library"]);
const VALID_ACCOUNT_SECTIONS = new Set<NonNullable<ViewParams["accountSection"]>>(["profile", "addresses", "quotes", "saved", "settings"]);
const VALID_INFO_PAGES = new Set<NonNullable<ViewParams["infoPage"]>>(["about", "help", "contact", "cgv", "privacy", "cookies", "delivery"]);
const VALID_CONTACT_REASONS = new Set<ContactReason>(["order", "delivery", "product", "recipe", "wholesale", "other"]);

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
    const view = requestedView as ViewId;
    const params = notificationParamsForView(view, target.searchParams);
    if (params === null) return null;
    return { view, ...(Object.keys(params).length ? { params } : {}) };
  } catch {
    return null;
  }
}

function notificationParamsForView(view: ViewId, searchParams: URLSearchParams): ViewParams | null {
  const params: ViewParams = {};
  const query = searchParams.get("query") || undefined;
  if (query) params.query = query;

  if (view === "product") {
    const productId = searchParams.get("productId");
    return productId ? { productId } : null;
  }

  if (view === "recipe-config") {
    const recipeId = searchParams.get("recipeId");
    return recipeId ? { recipeId } : null;
  }

  if (view === "order-tracking" || view === "order-confirmation") {
    const orderId = searchParams.get("orderId");
    return orderId ? { orderId } : null;
  }

  if (view === "catalog" || view === "wholesale") {
    const category = searchParams.get("category") || undefined;
    const sort = searchParams.get("sort");
    if (category) params.category = category;
    if (sort && VALID_SORTS.has(sort as NonNullable<ViewParams["sort"]>)) params.sort = sort as ViewParams["sort"];
    return params;
  }

  if (view === "recipes") {
    const recipeMode = searchParams.get("recipeMode");
    if (recipeMode && VALID_RECIPE_MODES.has(recipeMode as NonNullable<ViewParams["recipeMode"]>)) params.recipeMode = recipeMode as ViewParams["recipeMode"];
    return params;
  }

  if (view === "account") {
    const accountSection = searchParams.get("accountSection");
    if (accountSection && VALID_ACCOUNT_SECTIONS.has(accountSection as NonNullable<ViewParams["accountSection"]>)) params.accountSection = accountSection as ViewParams["accountSection"];
    return params;
  }

  if (view === "info") {
    const infoPage = searchParams.get("infoPage");
    const contactReason = searchParams.get("contactReason");
    if (infoPage && VALID_INFO_PAGES.has(infoPage as NonNullable<ViewParams["infoPage"]>)) params.infoPage = infoPage as ViewParams["infoPage"];
    if (contactReason && VALID_CONTACT_REASONS.has(contactReason as ContactReason)) params.contactReason = contactReason as ContactReason;
    return params;
  }

  return params;
}
