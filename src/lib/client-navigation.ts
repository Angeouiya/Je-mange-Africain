import type { ViewId, ViewParams } from "@/lib/store";

export type ClientPrimaryNavigationTarget = "home" | "catalog" | "wholesale" | "recipes" | "cart" | "orders" | "account";
export type ClientSidebarUtilityTarget = "account" | "settings" | "help" | "privacy";

export function clientPrimaryNavigationTarget(view: ViewId, surface: "mobile" | "desktop", authenticated: boolean): ClientPrimaryNavigationTarget | null {
  if (view === "home") return "home";
  if (view === "catalog" || view === "product") return "catalog";
  if (view === "wholesale") return surface === "mobile" ? "catalog" : "wholesale";
  if (view === "recipes" || view === "recipe-config") return "recipes";
  if (view === "cart" || view === "checkout") return "cart";
  if (view === "orders" || view === "order-tracking" || view === "order-confirmation") {
    if (surface === "mobile") return "account";
    return authenticated ? "orders" : null;
  }
  if (view === "account") return surface === "mobile" ? "account" : null;
  return null;
}

export function clientSidebarUtilityTarget(view: ViewId, params: ViewParams): ClientSidebarUtilityTarget | null {
  if (view === "account") return params.accountSection === "settings" ? "settings" : "account";
  if (view !== "info") return null;
  if (params.infoPage === "privacy" || params.infoPage === "cookies") return "privacy";
  if (params.infoPage === "help" || params.infoPage === "contact" || params.infoPage === "delivery") return "help";
  return null;
}
