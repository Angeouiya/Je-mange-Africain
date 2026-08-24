"use client";

import { Home, LayoutGrid, ChefHat, ShoppingBag, User } from "lucide-react";
import { useStore, ViewId, cartCount } from "@/lib/store";
import { dict } from "@/lib/i18n";

export function MobileNav() {
  const locale = useStore((s) => s.locale);
  const view = useStore((s) => s.view);
  const navigate = useStore((s) => s.navigate);
  const cart = useStore((s) => s.cart);
  const t = dict[locale];
  const count = cartCount(cart);

  const items: { id: ViewId; label: string; icon: any }[] = [
    { id: "home", label: t.mobileNav.home, icon: Home },
    { id: "catalog", label: t.mobileNav.categories, icon: LayoutGrid },
    { id: "recipes", label: t.mobileNav.recipes, icon: ChefHat },
    { id: "cart", label: t.mobileNav.cart, icon: ShoppingBag },
    { id: "account", label: t.mobileNav.account, icon: User },
  ];

  return (
    <nav className="jma-safe-bottom fixed bottom-0 left-0 right-0 z-40 border-t border-border/80 bg-white/95 px-2 pt-1 shadow-[0_-18px_40px_-34px_rgba(36,36,36,0.8)] backdrop-blur-xl md:hidden">
      <div className="grid grid-cols-5">
      {items.map((it) => {
        const active = view === it.id;
        const Icon = it.icon;
        return (
          <button
            key={it.id}
            onClick={() => navigate(it.id)}
            className={`relative flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-lg text-[10px] font-semibold transition ${
              active ? "bg-terre/10 text-terre" : "text-muted-foreground"
            }`}
            aria-label={it.label}
          >
            <Icon className={`h-5 w-5 ${active ? "scale-110" : ""} transition`} />
            <span className="leading-none">{it.label}</span>
            {it.id === "cart" && count > 0 && (
              <span className="absolute right-1/2 top-1 grid h-4 min-w-4 translate-x-3 place-items-center rounded-full bg-terre px-1 text-[9px] font-bold text-cream">
                {count}
              </span>
            )}
            {active && <span className="absolute bottom-1 h-0.5 w-8 rounded-full bg-terre" />}
          </button>
        );
      })}
      </div>
    </nav>
  );
}
