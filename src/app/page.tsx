"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Sparkles } from "reicon/icons/Sparkles";
import { customerProtectedDestination, hydrateStore, useStore, type ViewId, type ViewParams } from "@/lib/store";
import { Header } from "@/components/storefront/Header";
import { MobileNav } from "@/components/storefront/MobileNav";
import { HomeView } from "@/components/storefront/views/HomeView";
import { prefetchStorefrontData } from "@/lib/storefront-prefetch";
import { ReiconGlyph } from "@/components/ui/reicon-glyph";
import {
  loadAccountView,
  loadCartView,
  loadCatalogView,
  loadCheckoutView,
  loadInfoView,
  loadOrderConfirmationView,
  loadOrdersView,
  loadOrderTrackingView,
  loadProductDetailView,
  loadRecipeConfiguratorView,
  loadRecipesView,
  loadWholesaleView,
  preloadStorefrontViewBundle,
  type StorefrontViewLoader,
} from "@/components/storefront/view-loaders";

const dynamicView = (loader: StorefrontViewLoader) => dynamic(loader, { loading: ViewLoading });

const CatalogView = dynamicView(loadCatalogView);
const WholesaleView = dynamicView(loadWholesaleView);
const ProductDetailView = dynamicView(loadProductDetailView);
const RecipesView = dynamicView(loadRecipesView);
const RecipeConfiguratorView = dynamicView(loadRecipeConfiguratorView);
const CartView = dynamicView(loadCartView);
const CheckoutView = dynamicView(loadCheckoutView);
const OrderConfirmationView = dynamicView(loadOrderConfirmationView);
const OrdersView = dynamicView(loadOrdersView);
const OrderTrackingView = dynamicView(loadOrderTrackingView);
const AccountView = dynamicView(loadAccountView);
const InfoView = dynamicView(loadInfoView);

export default function Page() {
  const view = useStore((s) => s.view);
  const params = useStore((s) => s.params);
  const navigate = useStore((s) => s.navigate);
  const requestCustomerAuth = useStore((s) => s.requestCustomerAuth);
  const customer = useStore((s) => s.customer);
  const locale = useStore((s) => s.locale);
  const [mounted, setMounted] = useState(false);
  const viewIdentity = view === "product"
    ? `${view}:${params.productId || ""}`
    : view === "recipe-config"
      ? `${view}:${params.recipeId || ""}`
      : view === "order-tracking" || view === "order-confirmation"
        ? `${view}:${params.orderId || ""}`
        : view === "info"
          ? `${view}:${params.infoPage || "about"}`
          : view;

  useEffect(() => {
    let cancelled = false;
    const applyLocation = () => {
      const destination = storefrontDestination(new URLSearchParams(window.location.search));
      navigate(destination.view, destination.params);
    };
    const applyHydratedLocation = () => {
      void hydrateStore().then(() => {
        if (!cancelled) applyLocation();
      });
    };
    const initialize = async () => {
      try {
        await hydrateStore();
      } catch {
        // The public shell remains usable with its safe defaults.
      }
      if (cancelled) return;
      const sessionSubject = useStore.getState().customer?.id || null;
      const userAlreadyNavigated = useStore.getState().navigationHistory.length > 0;
      if (!userAlreadyNavigated) applyLocation();
      setMounted(true);
      fetch("/api/auth/customer/session", { cache: "no-store" })
        .then(async (response) => {
          if (!response.ok) throw new Error(`Session HTTP ${response.status}`);
          return response.json();
        })
        .then((payload) => {
          if (cancelled) return;
          const state = useStore.getState();
          const currentSubject = state.customer?.id || null;
          const responseSubject = payload?.customer?.id || null;
          if (currentSubject !== sessionSubject && currentSubject !== responseSubject) return;
          if (!payload?.customer) {
            if (state.customer) state.logout();
            else {
              state.setCustomer(null);
              state.setAddresses([]);
            }
            return;
          }
          const pendingTarget = state.authReturnTarget;
          if (sessionSubject && sessionSubject !== responseSubject) state.logout();
          state.setCustomer(payload.customer);
          if (Array.isArray(payload.addresses)) state.setAddresses(payload.addresses);
          state.mergeSavedItems(payload.favoriteProductIds || [], payload.savedRecipeIds || []);
          if (pendingTarget && state.view === "account") {
            state.consumeAuthReturnTarget();
            state.navigate(pendingTarget.view, pendingTarget.params);
          }
        })
        .catch(() => undefined);
    };
    void initialize();
    window.addEventListener("popstate", applyHydratedLocation);
    return () => {
      cancelled = true;
      window.removeEventListener("popstate", applyHydratedLocation);
    };
  }, [navigate]);

  useEffect(() => {
    if (!mounted || customer || !customerProtectedDestination(view, params)) return;
    requestCustomerAuth({ view, params });
  }, [customer, mounted, params, requestCustomerAuth, view]);

  useEffect(() => {
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    if (connection?.saveData || connection?.effectiveType?.includes("2g")) return;
    const preloadPrimaryViews = () => {
      void prefetchStorefrontData("home", {}, locale);
      if (!customer) return;
      void Promise.allSettled([
        preloadStorefrontViewBundle("catalog"),
        preloadStorefrontViewBundle("product"),
        preloadStorefrontViewBundle("recipes"),
        preloadStorefrontViewBundle("cart"),
      ]);
      void prefetchStorefrontData("catalog", {}, locale);
      void prefetchStorefrontData("recipes", {}, locale);
    };
    const preloadSecondaryViews = () => {
      void preloadStorefrontViewBundle("info");
      void prefetchStorefrontData("info", { infoPage: "about" }, locale);
      if (!customer) return;
      void Promise.allSettled([
        preloadStorefrontViewBundle("wholesale"),
        preloadStorefrontViewBundle("recipe-config"),
        preloadStorefrontViewBundle("checkout"),
        preloadStorefrontViewBundle("order-confirmation"),
        preloadStorefrontViewBundle("orders"),
        preloadStorefrontViewBundle("order-tracking"),
        preloadStorefrontViewBundle("account"),
        preloadStorefrontViewBundle("info"),
      ]);
      void prefetchStorefrontData("wholesale", {}, locale);
      void prefetchStorefrontData("checkout", {}, locale);
    };
    const browser = window as typeof window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    const cancelers: Array<() => void> = [];
    const schedule = (task: () => void, timeout: number, delay: number) => {
      if (browser.requestIdleCallback) {
        const handle = browser.requestIdleCallback(task, { timeout });
        cancelers.push(() => browser.cancelIdleCallback?.(handle));
        return;
      }
      const timer = window.setTimeout(task, delay);
      cancelers.push(() => window.clearTimeout(timer));
    };
    schedule(preloadPrimaryViews, 1_200, 500);
    schedule(preloadSecondaryViews, 3_200, 1_800);
    return () => cancelers.forEach((cancel) => cancel());
  }, [customer, locale]);

  useEffect(() => {
    if (!mounted) return;
    if (view === "home" && !new URLSearchParams(window.location.search).has("view")) return;
    if (view === "checkout" && new URLSearchParams(window.location.search).has("payment_intent")) return;
    const nextUrl = storefrontUrl(view, params);
    const currentUrl = `${window.location.pathname}${window.location.search}`;
    if (currentUrl !== nextUrl) window.history.replaceState(window.history.state, "", nextUrl);
  }, [mounted, params, view]);

  useEffect(() => {
    if (!mounted) return;
    const reset = () => window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    reset();
    const frame = window.requestAnimationFrame(reset);
    const settled = window.setTimeout(reset, 240);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(settled);
    };
  }, [mounted, viewIdentity]);

  const isPublicAuthGate = view === "account" && !customer;

  return (
    <div className="jma-shell min-h-screen">
      {isPublicAuthGate ? null : <MobileNav ready={mounted} />}
      <div className={`flex min-h-screen flex-col ${isPublicAuthGate ? "" : "md:pl-64"}`}>
      {isPublicAuthGate ? null : <Header />}
      <main id="main-content" tabIndex={-1} className={isPublicAuthGate ? "flex-1" : "flex-1 pb-20 md:pb-0"}>
        <div key={viewIdentity}>{renderView(view)}</div>
      </main>
      </div>
    </div>
  );
}

const ROUTABLE_VIEWS = new Set<ViewId>(["home", "catalog", "wholesale", "product", "recipes", "recipe-config", "cart", "checkout", "order-confirmation", "orders", "order-tracking", "account", "info"]);

function storefrontDestination(searchParams: URLSearchParams): { view: ViewId; params: ViewParams } {
  const requestedView = searchParams.get("view") as ViewId | null;
  const view = requestedView && ROUTABLE_VIEWS.has(requestedView) ? requestedView : "home";
  const params: ViewParams = {};

  if (view === "product") {
    const productId = searchParams.get("productId");
    return productId ? { view, params: { productId } } : { view: "catalog", params: {} };
  }
  if (view === "recipe-config") {
    const recipeId = searchParams.get("recipeId");
    return recipeId ? { view, params: { recipeId } } : { view: "recipes", params: {} };
  }
  if (view === "order-tracking" || view === "order-confirmation") {
    const orderId = searchParams.get("orderId");
    return orderId ? { view, params: { orderId } } : { view: "orders", params: {} };
  }
  if (view === "catalog") {
    params.category = searchParams.get("category") || undefined;
    params.query = searchParams.get("query") || undefined;
    const sort = searchParams.get("sort");
    if (["popular", "priceAsc", "priceDesc", "new", "available"].includes(sort || "")) params.sort = sort as ViewParams["sort"];
  }
  if (view === "recipes") {
    const recipeMode = searchParams.get("recipeMode");
    params.recipeMode = recipeMode === "library" ? "library" : recipeMode === "recipes" ? "recipes" : undefined;
    params.query = searchParams.get("query") || undefined;
  }
  if (view === "account") {
    const accountSection = searchParams.get("accountSection");
    if (["profile", "addresses", "quotes", "saved", "settings"].includes(accountSection || "")) params.accountSection = accountSection as ViewParams["accountSection"];
    const returnView = searchParams.get("returnView") as ViewId | null;
    if (returnView && ROUTABLE_VIEWS.has(returnView)) params.returnView = returnView;
  }
  if (view === "info") {
    const infoPage = searchParams.get("infoPage");
    if (["about", "help", "contact", "cgv", "privacy", "cookies", "delivery"].includes(infoPage || "")) params.infoPage = infoPage as ViewParams["infoPage"];
    const contactReason = searchParams.get("contactReason");
    if (["order", "delivery", "product", "recipe", "wholesale", "other"].includes(contactReason || "")) params.contactReason = contactReason as ViewParams["contactReason"];
  }

  return { view, params };
}

function storefrontUrl(view: ViewId, params: ViewParams) {
  if (view === "home") return "/";
  const searchParams = new URLSearchParams({ view });
  const append = (key: string, value: string | undefined) => { if (value) searchParams.set(key, value); };
  append("productId", params.productId);
  append("recipeId", params.recipeId);
  append("orderId", params.orderId);
  append("category", params.category);
  append("query", params.query);
  append("sort", params.sort);
  append("recipeMode", params.recipeMode);
  append("accountSection", params.accountSection);
  append("returnView", params.returnView);
  append("infoPage", params.infoPage);
  append("contactReason", params.contactReason);
  return `/?${searchParams.toString()}`;
}

function renderView(view: string) {
  switch (view) {
    case "home": return <HomeView />;
    case "catalog": return <CatalogView />;
    case "wholesale": return <WholesaleView />;
    case "product": return <ProductDetailView />;
    case "recipes": return <RecipesView />;
    case "recipe-config": return <RecipeConfiguratorView />;
    case "cart": return <CartView />;
    case "checkout": return <CheckoutView />;
    case "order-confirmation": return <OrderConfirmationView />;
    case "orders": return <OrdersView />;
    case "order-tracking": return <OrderTrackingView />;
    case "account": return <AccountView />;
    case "info": return <InfoView />;
    default: return <HomeView />;
  }
}

function ViewLoading() {
  const locale = useStore((state) => state.locale);
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-5 md:px-7 md:py-8 lg:px-8" role="status" aria-live="polite" aria-label={locale === "fr" ? "Chargement de la vue" : "Loading view"} data-testid="storefront-view-loading">
      <div className="flex items-center gap-3 border-b border-charcoal/8 pb-5">
        <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-md border border-terre/12 bg-[linear-gradient(145deg,rgba(185,71,43,0.11),rgba(242,169,0,0.07))] text-terre shadow-[0_18px_34px_-28px_rgba(185,71,43,0.82)]">
          <span className="absolute inset-2 rounded border border-terre/20" />
          <ReiconGlyph icon={Sparkles} weight="Filled" className="h-4 w-4 animate-pulse" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block h-3 w-24 animate-pulse rounded bg-terre/16" />
          <span className="mt-2 block h-6 w-full max-w-xs animate-pulse rounded bg-charcoal/8" />
        </span>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="overflow-hidden rounded-md border border-charcoal/8 bg-white shadow-[0_14px_34px_-30px_rgba(90,38,50,0.62)]">
            <div className="aspect-[4/3] animate-pulse bg-[linear-gradient(115deg,#F8F4F3_0%,#FFF9F2_46%,#F7EEE9_100%)]" />
            <div className="space-y-2 p-2.5">
              <div className="h-3 w-4/5 animate-pulse rounded bg-charcoal/9" />
              <div className="h-2.5 w-3/5 animate-pulse rounded bg-terre/13" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
