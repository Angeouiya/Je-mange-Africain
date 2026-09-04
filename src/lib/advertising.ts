import { z } from "zod";
import type { ViewId, ViewParams } from "./store";

const destination = z.string().trim().min(1).max(1000).refine((value) => value.startsWith("/") || /^https:\/\//i.test(value), "Destination invalide");
const optionalDate = z.union([z.string().datetime({ offset: true }), z.literal(""), z.null()]).optional();

export const AdvertisementInput = z.object({
  placement: z.enum(["home", "catalog", "recipes", "checkout"]),
  titleFr: z.string().trim().min(3).max(100),
  titleEn: z.string().trim().min(3).max(100),
  bodyFr: z.string().trim().max(260).optional().default(""),
  bodyEn: z.string().trim().max(260).optional().default(""),
  imageUrl: z.string().url().max(1000),
  imageAltFr: z.string().trim().min(3).max(180),
  imageAltEn: z.string().trim().min(3).max(180),
  linkUrl: destination,
  status: z.enum(["draft", "published", "archived"]),
  priority: z.coerce.number().int().min(0).max(100),
  startsAt: optionalDate,
  endsAt: optionalDate,
}).superRefine((value, context) => {
  if (value.startsAt && value.endsAt && new Date(value.endsAt) <= new Date(value.startsAt)) {
    context.addIssue({ code: "custom", path: ["endsAt"], message: "La fin doit être postérieure au début." });
  }
});

export const advertisementData = (input: z.infer<typeof AdvertisementInput>) => ({
  ...input,
  startsAt: input.startsAt ? new Date(input.startsAt) : null,
  endsAt: input.endsAt ? new Date(input.endsAt) : null,
});

export type AdvertisementLifecycle = "active" | "scheduled" | "draft" | "expired" | "archived";

type AdvertisementSchedule = {
  status: "draft" | "published" | "archived";
  startsAt?: string | Date | null;
  endsAt?: string | Date | null;
};

function validTime(value?: string | Date | null) {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

export function advertisementLifecycle(advertisement: AdvertisementSchedule, now: string | Date = new Date()): AdvertisementLifecycle {
  if (advertisement.status === "draft") return "draft";
  if (advertisement.status === "archived") return "archived";

  const currentTime = validTime(now) ?? Date.now();
  const startsAt = validTime(advertisement.startsAt);
  const endsAt = validTime(advertisement.endsAt);
  if (endsAt !== null && endsAt <= currentTime) return "expired";
  if (startsAt !== null && startsAt > currentTime) return "scheduled";
  return "active";
}

const ROUTABLE_VIEWS = new Set<ViewId>(["home", "catalog", "wholesale", "product", "recipes", "recipe-config", "cart", "checkout", "order-confirmation", "orders", "order-tracking", "account", "info"]);
const SORT_OPTIONS = new Set<NonNullable<ViewParams["sort"]>>(["popular", "priceAsc", "priceDesc", "new", "available"]);
const ACCOUNT_SECTIONS = new Set<NonNullable<ViewParams["accountSection"]>>(["profile", "addresses", "saved", "settings"]);
const INFO_PAGES = new Set<NonNullable<ViewParams["infoPage"]>>(["about", "help", "contact", "cgv", "privacy", "cookies", "delivery"]);
const CONTACT_REASONS = new Set<NonNullable<ViewParams["contactReason"]>>(["order", "delivery", "product", "recipe", "wholesale", "other"]);

export type AdvertisementDestination =
  | { kind: "storefront"; view: ViewId; params: ViewParams }
  | { kind: "url"; href: string; external: boolean };

/** Converts campaign links into native storefront navigation whenever possible. */
export function advertisementDestination(linkUrl?: string | null): AdvertisementDestination | null {
  if (!linkUrl?.trim()) return null;

  const storefrontOrigin = "https://je-mange-africain.com";
  let url: URL;
  try {
    url = new URL(linkUrl, storefrontOrigin);
  } catch {
    return null;
  }

  const internalHost = url.hostname === "je-mange-africain.com" || url.hostname === "www.je-mange-africain.com";
  if (!internalHost) return { kind: "url", href: url.toString(), external: true };
  if (url.pathname !== "/") return { kind: "url", href: `${url.pathname}${url.search}${url.hash}`, external: false };

  const requestedView = url.searchParams.get("view") as ViewId | null;
  const view = requestedView && ROUTABLE_VIEWS.has(requestedView) ? requestedView : "home";
  const params: ViewParams = {};

  if (view === "product") {
    const productId = url.searchParams.get("productId");
    return productId ? { kind: "storefront", view, params: { productId } } : { kind: "storefront", view: "catalog", params: {} };
  }
  if (view === "recipe-config") {
    const recipeId = url.searchParams.get("recipeId");
    return recipeId ? { kind: "storefront", view, params: { recipeId } } : { kind: "storefront", view: "recipes", params: {} };
  }
  if (view === "order-tracking" || view === "order-confirmation") {
    const orderId = url.searchParams.get("orderId");
    return orderId ? { kind: "storefront", view, params: { orderId } } : { kind: "storefront", view: "orders", params: {} };
  }
  if (view === "catalog") {
    params.category = url.searchParams.get("category") || undefined;
    params.query = url.searchParams.get("query") || undefined;
    const sort = url.searchParams.get("sort") as NonNullable<ViewParams["sort"]> | null;
    if (sort && SORT_OPTIONS.has(sort)) params.sort = sort;
  }
  if (view === "recipes") {
    const recipeMode = url.searchParams.get("recipeMode");
    if (recipeMode === "recipes" || recipeMode === "library") params.recipeMode = recipeMode;
    params.query = url.searchParams.get("query") || undefined;
  }
  if (view === "account") {
    const accountSection = url.searchParams.get("accountSection") as NonNullable<ViewParams["accountSection"]> | null;
    if (accountSection && ACCOUNT_SECTIONS.has(accountSection)) params.accountSection = accountSection;
    const returnView = url.searchParams.get("returnView") as ViewId | null;
    if (returnView && ROUTABLE_VIEWS.has(returnView)) params.returnView = returnView;
  }
  if (view === "info") {
    const infoPage = url.searchParams.get("infoPage") as NonNullable<ViewParams["infoPage"]> | null;
    if (infoPage && INFO_PAGES.has(infoPage)) params.infoPage = infoPage;
    const contactReason = url.searchParams.get("contactReason") as NonNullable<ViewParams["contactReason"]> | null;
    if (contactReason && CONTACT_REASONS.has(contactReason)) params.contactReason = contactReason;
  }

  return { kind: "storefront", view, params };
}
