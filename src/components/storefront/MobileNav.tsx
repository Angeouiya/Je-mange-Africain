"use client";

import { Home, LayoutGrid, ChefHat, ShoppingBag, User, Settings, LifeBuoy, LogIn, LogOut, ClipboardList } from "lucide-react";
import type { LucideIcon } from "lucide-react";
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

  const publicItems: { id: ViewId; label: string; icon: LucideIcon }[] = [
    { id: "home", label: t.mobileNav.home, icon: Home },
    { id: "catalog", label: t.mobileNav.categories, icon: LayoutGrid },
    { id: "recipes", label: t.mobileNav.recipes, icon: ChefHat },
    { id: "cart", label: t.mobileNav.cart, icon: ShoppingBag },
  ];
  const accountItem = {
    id: "account" as ViewId,
    label: customer ? t.mobileNav.account : t.nav.login,
    icon: customer ? User : LogIn,
  };
  const mobileItems = [...publicItems, accountItem];
  const desktopGroups: Array<{ label: string; items: Array<{ id: ViewId; label: string; icon: LucideIcon }> }> = [
    { label: locale === "fr" ? "Explorer" : "Explore", items: publicItems.filter((item) => item.id !== "cart") },
    {
      label: locale === "fr" ? "Mes achats" : "My shopping",
      items: [
        publicItems.find((item) => item.id === "cart")!,
        ...(customer ? [{ id: "orders" as ViewId, label: t.orders.title, icon: ClipboardList }] : []),
      ],
    },
  ];

  const isActive = (id: ViewId) => view === id
    || (id === "catalog" && view === "product")
    || (id === "recipes" && view === "recipe-config")
    || (id === "orders" && view === "order-tracking");

  const renderMobileItem = (it: (typeof mobileItems)[number]) => {
        const active = isActive(it.id);
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
        <div className="mx-auto grid max-w-xl grid-cols-5">{mobileItems.map(renderMobileItem)}</div>
      </nav>

      <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 flex-col border-r border-white/10 bg-charcoal text-white md:flex">
        <div className="african-kente-stripe h-1 shrink-0" />
        <button onClick={() => navigate("home")} className="border-b border-white/10 px-5 py-4 text-left" aria-label={locale === "fr" ? "Accueil" : "Home"}>
          <BrandLockup compact inverse />
        </button>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {desktopGroups.map((group, groupIndex) => <div key={group.label} className={groupIndex ? "mt-5" : ""}>
            <p className="px-3 pb-1.5 text-[10px] font-extrabold uppercase text-white/35">{group.label}</p>
            <div className="space-y-1">{group.items.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.id);
              return (
                <button key={item.id} onClick={() => navigate(item.id)} aria-current={active ? "page" : undefined} className={`flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-semibold transition ${active ? "bg-terre text-white" : "text-white/75 hover:bg-white/8 hover:text-white"}`}>
                  <Icon className="h-4.5 w-4.5 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {item.id === "cart" && count > 0 ? <span className={`grid h-5 min-w-5 place-items-center rounded-full px-1 text-[10px] font-extrabold ${active ? "bg-white text-terre" : "bg-gold text-charcoal"}`}>{count}</span> : null}
                </button>
              );
            })}</div>
          </div>)}
        </nav>

        <div className="border-t border-white/10 p-3">
          {customer ? (
            <button type="button" onClick={() => navigate("account", { accountSection: "profile" })} className="mb-2 flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-white/8">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-terre text-xs font-extrabold text-white">{customer.firstName[0]}{customer.lastName[0] || ""}</span>
              <span className="min-w-0"><span className="block truncate text-xs font-bold text-white">{customer.firstName} {customer.lastName}</span><span className="block truncate text-[10px] text-white/55">{customer.email}</span></span>
            </button>
          ) : null}
          {customer ? <button onClick={() => navigate("account", { accountSection: "settings" })} className="flex min-h-10 w-full items-center gap-3 rounded-md px-3 text-left text-xs font-semibold text-white/70 hover:bg-white/8 hover:text-white"><Settings className="h-4 w-4" /> {locale === "fr" ? "Paramètres" : "Settings"}</button> : <button onClick={() => navigate("account")} className="flex min-h-10 w-full items-center gap-3 rounded-md px-3 text-left text-xs font-semibold text-white/70 hover:bg-white/8 hover:text-white"><LogIn className="h-4 w-4" /> {t.nav.login}</button>}
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
