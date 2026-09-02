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

  type ClientNavItem = { id: ViewId; label: string; desktopLabel: string; purpose: string; icon: LucideIcon; accent: string };
  const publicItems: ClientNavItem[] = [
    { id: "home", label: t.mobileNav.home, desktopLabel: locale === "fr" ? "Découvrir" : "Discover", purpose: locale === "fr" ? "Sélections et nouveautés" : "Selections and new arrivals", icon: Home, accent: "#B74325" },
    { id: "catalog", label: t.mobileNav.categories, desktopLabel: locale === "fr" ? "Acheter les produits" : "Shop products", purpose: locale === "fr" ? "Rayons, origine et disponibilité" : "Categories, origin and availability", icon: LayoutGrid, accent: "#2F6B4F" },
    { id: "recipes", label: t.mobileNav.recipes, desktopLabel: locale === "fr" ? "Cuisiner une recette" : "Cook a recipe", purpose: locale === "fr" ? "Personnaliser puis composer le panier" : "Customise and build the basket", icon: ChefHat, accent: "#805C00" },
    { id: "cart", label: t.mobileNav.cart, desktopLabel: locale === "fr" ? "Finaliser le panier" : "Complete basket", purpose: locale === "fr" ? "Quantités, livraison et total" : "Quantities, delivery and total", icon: ShoppingBag, accent: "#326B8A" },
  ];
  const accountItem = {
    id: "account" as ViewId,
    label: customer ? t.mobileNav.account : t.nav.login,
    desktopLabel: customer ? (locale === "fr" ? "Mon espace" : "My account") : t.nav.login,
    purpose: customer ? (locale === "fr" ? "Profil et préférences" : "Profile and preferences") : (locale === "fr" ? "Accéder à vos services" : "Access your services"),
    icon: customer ? User : LogIn,
    accent: "#9A4E63",
  };
  const mobileItems = [...publicItems, accountItem];
  const desktopGroups: Array<{ label: string; intent: string; items: ClientNavItem[] }> = [
    { label: locale === "fr" ? "Explorer" : "Explore", intent: locale === "fr" ? "Choisir" : "Choose", items: publicItems.filter((item) => item.id !== "cart") },
    {
      label: locale === "fr" ? "Mes achats" : "My shopping",
      intent: locale === "fr" ? "Finaliser" : "Complete",
      items: [
        publicItems.find((item) => item.id === "cart")!,
        ...(customer ? [{ id: "orders" as ViewId, label: t.orders.title, desktopLabel: locale === "fr" ? "Suivre mes commandes" : "Track my orders", purpose: locale === "fr" ? "Statut, colis et livraison" : "Status, parcels and delivery", icon: ClipboardList, accent: "#39756A" }] : []),
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
            className={`relative flex min-h-[3.75rem] flex-col items-center justify-center gap-1 text-[9px] font-bold transition-colors ${
              active ? "text-terre" : "text-muted-foreground hover:text-charcoal"
            }`}
            aria-label={it.label}
          >
            <Icon className={`h-[1.15rem] w-[1.15rem] ${active ? "stroke-[2.4]" : ""} transition`} />
            <span className="leading-none">{it.label}</span>
            {it.id === "cart" && count > 0 && (
              <span className="absolute right-1/2 top-1 grid h-4 min-w-4 translate-x-3 place-items-center rounded-full bg-terre px-1 text-[9px] font-bold text-cream">
                {count}
              </span>
            )}
            {active && <span className="absolute inset-x-4 top-0 h-0.5 bg-terre" />}
          </button>
        );
  };

  return (
    <>
      <nav className="jma-safe-bottom fixed bottom-0 left-0 right-0 z-40 border-t border-charcoal/10 bg-white/96 px-1 shadow-[0_-16px_36px_-30px_rgba(24,26,24,0.75)] backdrop-blur-xl md:hidden">
        <div className="mx-auto grid max-w-xl grid-cols-5">{mobileItems.map(renderMobileItem)}</div>
      </nav>

      <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 flex-col border-r border-white/8 bg-charcoal text-white md:flex">
        <div className="african-kente-stripe h-[3px] shrink-0" />
        <button onClick={() => navigate("home")} className="border-b border-white/8 px-5 py-5 text-left" aria-label={locale === "fr" ? "Accueil" : "Home"}>
          <BrandLockup compact inverse />
        </button>

        <nav className="flex-1 overflow-y-auto px-3 py-5">
          {desktopGroups.map((group, groupIndex) => <div key={group.label} className={groupIndex ? "mt-5" : ""}>
            <div className="flex items-center px-3 pb-2"><p className="text-[9px] font-extrabold uppercase text-white/72">{group.label}</p><span className="ml-auto text-[8px] font-bold uppercase text-white/62">{group.intent}</span></div>
            <div className="space-y-1">{group.items.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.id);
              return (
                <button key={item.id} onClick={() => navigate(item.id)} aria-current={active ? "page" : undefined} className={`flex min-h-[3.75rem] w-full items-center gap-3 rounded-md border-l-2 px-3 text-left transition ${active ? "bg-white text-charcoal shadow-sm" : "border-transparent text-white/72 hover:bg-white/7 hover:text-white"}`} style={active ? { borderLeftColor: item.accent } : undefined}>
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-white" style={{ backgroundColor: active ? item.accent : `${item.accent}28` }}><Icon className="h-[1.05rem] w-[1.05rem]" /></span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-xs font-extrabold">{item.desktopLabel}</span><span className={`mt-1 block truncate text-[9px] ${active ? "text-charcoal/72" : "text-white/62"}`}>{item.purpose}</span></span>
                  {item.id === "cart" && count > 0 ? <span className="grid h-5 min-w-5 place-items-center rounded-full bg-gold px-1 text-[10px] font-extrabold text-charcoal">{count}</span> : null}
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
