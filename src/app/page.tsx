"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { useStore, type ViewId, type ViewParams } from "@/lib/store";
import { Header } from "@/components/storefront/Header";
import { MobileNav } from "@/components/storefront/MobileNav";
import { HomeView } from "@/components/storefront/views/HomeView";

const dynamicView = (loader: () => Promise<any>) => dynamic(loader, { loading: ViewLoading });
const CatalogView = dynamicView(() => import("@/components/storefront/views/CatalogView").then((module) => module.CatalogView));
const WholesaleView = dynamicView(() => import("@/components/storefront/views/WholesaleView").then((module) => module.WholesaleView));
const ProductDetailView = dynamicView(() => import("@/components/storefront/views/ProductDetailView").then((module) => module.ProductDetailView));
const RecipesView = dynamicView(() => import("@/components/storefront/views/RecipesView").then((module) => module.RecipesView));
const RecipeConfiguratorView = dynamicView(() => import("@/components/storefront/views/RecipeConfiguratorView").then((module) => module.RecipeConfiguratorView));
const CartView = dynamicView(() => import("@/components/storefront/views/CartView").then((module) => module.CartView));
const CheckoutView = dynamicView(() => import("@/components/storefront/views/CheckoutView").then((module) => module.CheckoutView));
const OrderConfirmationView = dynamicView(() => import("@/components/storefront/views/OrderConfirmationView").then((module) => module.OrderConfirmationView));
const OrdersView = dynamicView(() => import("@/components/storefront/views/OrdersView").then((module) => module.OrdersView));
const OrderTrackingView = dynamicView(() => import("@/components/storefront/views/OrderTrackingView").then((module) => module.OrderTrackingView));
const AccountView = dynamicView(() => import("@/components/storefront/views/AccountView").then((module) => module.AccountView));
const InfoView = dynamicView(() => import("@/components/storefront/views/InfoView").then((module) => module.InfoView));

export default function Page() {
  const view = useStore((s) => s.view);
  const params = useStore((s) => s.params);
  const navigate = useStore((s) => s.navigate);
  const customer = useStore((s) => s.customer);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sessionSubject = useStore.getState().customer?.id || null;
    const applyLocation = () => {
      const destination = storefrontDestination(new URLSearchParams(window.location.search));
      navigate(destination.view, destination.params);
    };
    applyLocation();
    setMounted(true);
    window.addEventListener("popstate", applyLocation);
    fetch("/api/auth/customer/session", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Session HTTP ${response.status}`);
        return response.json();
      })
      .then((payload) => {
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
        if (sessionSubject && sessionSubject !== responseSubject) state.logout();
        state.setCustomer(payload.customer);
        if (Array.isArray(payload.addresses)) state.setAddresses(payload.addresses);
        state.mergeSavedItems(payload.favoriteProductIds || [], payload.savedRecipeIds || []);
      })
      .catch(() => undefined);
    return () => window.removeEventListener("popstate", applyLocation);
  }, [navigate]);

  useEffect(() => {
    if (!mounted) return;
    if (view === "home" && !new URLSearchParams(window.location.search).has("view")) return;
    const nextUrl = storefrontUrl(view, params);
    const currentUrl = `${window.location.pathname}${window.location.search}`;
    if (currentUrl !== nextUrl) window.history.replaceState(window.history.state, "", nextUrl);
  }, [mounted, params, view]);

  // Avoid hydration mismatch: render a stable shell on first paint
  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <div className="flex flex-col items-center gap-3">
          <Image src="/brand/app-icon-192-burgundy.png" alt="Je mange Africain" width={96} height={96} loading="eager" fetchPriority="high" className="h-20 w-20 animate-pulse rounded-lg object-contain" />
          <div className="h-1 w-24 overflow-hidden rounded-full bg-muted">
            <div className="shimmer h-full w-full" />
          </div>
        </div>
      </div>
    );
  }

  const isPublicAuthGate = view === "account" && !customer;

  return (
    <div className="jma-shell min-h-screen">
      {isPublicAuthGate ? null : <MobileNav />}
      <div className={`flex min-h-screen flex-col ${isPublicAuthGate ? "" : "md:pl-64"}`}>
      {isPublicAuthGate ? null : <Header />}
      <main id="main-content" tabIndex={-1} className={isPublicAuthGate ? "flex-1" : "flex-1 pb-20 md:pb-0"}>
        <AnimatePresence mode="wait">
          <motion.div
            key={view + JSON.stringify(useStore.getState().params)}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {renderView(view)}
          </motion.div>
        </AnimatePresence>
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
  if (view === "order-tracking") {
    const orderId = searchParams.get("orderId");
    return orderId ? { view, params: { orderId } } : { view: "orders", params: {} };
  }
  if (view === "catalog") {
    params.category = searchParams.get("category") || undefined;
    params.query = searchParams.get("query") || undefined;
  }
  if (view === "recipes") {
    const recipeMode = searchParams.get("recipeMode");
    params.recipeMode = recipeMode === "library" ? "library" : recipeMode === "recipes" ? "recipes" : undefined;
    params.query = searchParams.get("query") || undefined;
  }
  if (view === "account") {
    const accountSection = searchParams.get("accountSection");
    if (["profile", "addresses", "saved", "settings"].includes(accountSection || "")) params.accountSection = accountSection as ViewParams["accountSection"];
    const returnView = searchParams.get("returnView") as ViewId | null;
    if (returnView && ROUTABLE_VIEWS.has(returnView)) params.returnView = returnView;
  }
  if (view === "info") {
    const infoPage = searchParams.get("infoPage");
    if (["about", "help", "contact", "cgv", "privacy", "cookies", "delivery"].includes(infoPage || "")) params.infoPage = infoPage as ViewParams["infoPage"];
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
  append("recipeMode", params.recipeMode);
  append("accountSection", params.accountSection);
  append("returnView", params.returnView);
  append("infoPage", params.infoPage);
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
    <div className="mx-auto w-full max-w-7xl px-4 py-8 lg:px-6" role="status" aria-live="polite" aria-label={locale === "fr" ? "Chargement de la vue" : "Loading view"}>
      <div className="h-7 w-48 animate-pulse rounded-md bg-muted" />
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-48 animate-pulse rounded-lg bg-muted" />)}
      </div>
    </div>
  );
}
