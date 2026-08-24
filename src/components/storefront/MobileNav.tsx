"use client";

import { Home, LayoutGrid, ChefHat, ShoppingBag, User, Settings, LifeBuoy, LogIn, LogOut } from "lucide-react";
import { useStore, ViewId, cartCount } from "@/lib/store";
import { dict } from "@/lib/i18n";
import { BrandLockup } from "@/components/shared/BrandLockup";
import { LogoutConfirmDialog } from "@/components/storefront/LogoutConfirmDialog";

export function MobileNav() {
  const locale = useStore((s) => s.locale);
  const view = useStore((s) => s.view);
  const navigate = useStore((s) => s.navigate);
  const cart = useStore((s) => s.cart);
  const customer = useStore((s) => s.customer);
  const t = dict[locale];
  const count = cartCount(cart);

  const items: { id: ViewId; label: string; icon: any }[] = [
    { id: "home", label: t.mobileNav.home, icon: Home },
    { id: "catalog", label: t.mobileNav.categories, icon: LayoutGrid },
    { id: "recipes", label: t.mobileNav.recipes, icon: ChefHat },
    { id: "cart", label: t.mobileNav.cart, icon: ShoppingBag },
    { id: "account", label: t.mobileNav.account, icon: User },
  ];

  const renderMobileItem = (it: (typeof items)[number]) => {
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
  };

  return (
    <>
      <nav className="jma-safe-bottom fixed bottom-0 left-0 right-0 z-40 border-t border-border/80 bg-white/95 px-2 pt-1 shadow-[0_-18px_40px_-34px_rgba(36,36,36,0.8)] backdrop-blur-xl md:hidden">
        <div className="mx-auto grid max-w-xl grid-cols-5">{items.map(renderMobileItem)}</div>
      </nav>

      <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 flex-col border-r border-white/10 bg-charcoal text-white md:flex">
        <div className="african-kente-stripe h-1 shrink-0" />
        <button onClick={() => navigate("home")} className="border-b border-white/10 px-5 py-4 text-left" aria-label={locale === "fr" ? "Accueil" : "Home"}>
          <BrandLockup compact inverse />
        </button>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {items.map((item) => {
            const Icon = item.icon;
            const active = view === item.id;
            return (
              <button key={item.id} onClick={() => navigate(item.id)} className={`flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-semibold transition ${active ? "bg-terre text-white" : "text-white/75 hover:bg-white/8 hover:text-white"}`}>
                <Icon className="h-4.5 w-4.5 shrink-0" />
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {item.id === "cart" && count > 0 ? <span className={`grid h-5 min-w-5 place-items-center rounded-full px-1 text-[10px] font-extrabold ${active ? "bg-white text-terre" : "bg-gold text-charcoal"}`}>{count}</span> : null}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-3">
          {customer ? (
            <div className="mb-2 flex items-center gap-3 px-2 py-2">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-terre text-xs font-extrabold text-white">{customer.firstName[0]}{customer.lastName[0] || ""}</span>
              <span className="min-w-0"><span className="block truncate text-xs font-bold text-white">{customer.firstName} {customer.lastName}</span><span className="block truncate text-[10px] text-white/55">{customer.email}</span></span>
            </div>
          ) : null}
          <button onClick={() => navigate("account", customer ? { accountSection: "settings" } : undefined)} className="flex min-h-10 w-full items-center gap-3 rounded-md px-3 text-left text-xs font-semibold text-white/70 hover:bg-white/8 hover:text-white">
            {customer ? <Settings className="h-4 w-4" /> : <LogIn className="h-4 w-4" />} {customer ? (locale === "fr" ? "Paramètres" : "Settings") : t.nav.login}
          </button>
          <button onClick={() => navigate("info", { infoPage: "help" })} className="flex min-h-10 w-full items-center gap-3 rounded-md px-3 text-left text-xs font-semibold text-white/70 hover:bg-white/8 hover:text-white"><LifeBuoy className="h-4 w-4" /> {t.nav.help}</button>
          {customer ? (
            <LogoutConfirmDialog>
              <button className="flex min-h-10 w-full items-center gap-3 rounded-md px-3 text-left text-xs font-semibold text-red-200 hover:bg-red-500/10 hover:text-red-100"><LogOut className="h-4 w-4" /> {locale === "fr" ? "Se déconnecter" : "Sign out"}</button>
            </LogoutConfirmDialog>
          ) : null}
        </div>
      </aside>
    </>
  );
}
