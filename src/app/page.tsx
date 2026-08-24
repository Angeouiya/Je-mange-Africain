"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { Header } from "@/components/storefront/Header";
import { MobileNav } from "@/components/storefront/MobileNav";
import { HomeView } from "@/components/storefront/views/HomeView";
import { CatalogView } from "@/components/storefront/views/CatalogView";
import { ProductDetailView } from "@/components/storefront/views/ProductDetailView";
import { RecipesView } from "@/components/storefront/views/RecipesView";
import { RecipeConfiguratorView } from "@/components/storefront/views/RecipeConfiguratorView";
import { CartView } from "@/components/storefront/views/CartView";
import { CheckoutView } from "@/components/storefront/views/CheckoutView";
import { OrderConfirmationView } from "@/components/storefront/views/OrderConfirmationView";
import { OrdersView } from "@/components/storefront/views/OrdersView";
import { OrderTrackingView } from "@/components/storefront/views/OrderTrackingView";
import { AccountView } from "@/components/storefront/views/AccountView";
import { InfoView } from "@/components/storefront/views/InfoView";

export default function Page() {
  const view = useStore((s) => s.view);
  const navigate = useStore((s) => s.navigate);
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
          <Image src="/brand/app-icon-192.png" alt="Je mange Africain" width={96} height={96} className="h-20 w-20 animate-pulse rounded-lg object-contain" />
          <div className="h-1 w-24 overflow-hidden rounded-full bg-muted">
            <div className="shimmer h-full w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="jma-shell min-h-screen">
      <MobileNav />
      <div className="flex min-h-screen flex-col md:pl-64">
      <Header />
      <main className="flex-1 pb-20 md:pb-0">
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
