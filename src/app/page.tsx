"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { Header } from "@/components/storefront/Header";
import { MobileNav } from "@/components/storefront/MobileNav";
import { HomeView } from "@/components/storefront/views/HomeView";

const dynamicView = (loader: () => Promise<any>) => dynamic(loader, { loading: ViewLoading });
const CatalogView = dynamicView(() => import("@/components/storefront/views/CatalogView").then((module) => module.CatalogView));
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
  const navigate = useStore((s) => s.navigate);
  const customer = useStore((s) => s.customer);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const searchParams = new URLSearchParams(window.location.search);
    const requestedView = searchParams.get("view");
    if (requestedView === "recipe-config" && searchParams.get("recipeId")) {
      navigate("recipe-config", { recipeId: searchParams.get("recipeId") || undefined });
    }
    if (["catalog", "recipes", "orders", "account"].includes(requestedView || "")) {
      navigate(requestedView as "catalog" | "recipes" | "orders" | "account");
    }
    fetch("/api/auth/customer/session", { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() : null)
      .then((payload) => useStore.getState().setCustomer(payload?.customer || null))
      .catch(() => undefined);
  }, [navigate]);

  // Avoid hydration mismatch: render a stable shell on first paint
  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <div className="flex flex-col items-center gap-3">
          <Image src="/brand/app-icon-192.png" alt="Je mange Africain" width={96} height={96} loading="eager" fetchPriority="high" className="h-20 w-20 animate-pulse rounded-lg object-contain" />
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

function renderView(view: string) {
  switch (view) {
    case "home": return <HomeView />;
    case "catalog": return <CatalogView />;
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
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 lg:px-6" role="status" aria-live="polite" aria-label="Chargement de la vue">
      <div className="h-7 w-48 animate-pulse rounded-md bg-muted" />
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-48 animate-pulse rounded-lg bg-muted" />)}
      </div>
    </div>
  );
}
