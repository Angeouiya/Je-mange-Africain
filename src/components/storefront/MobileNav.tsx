"use client";

import { motion } from "framer-motion";
import { Home, LayoutGrid, Boxes, ChefHat, ShoppingBag, User, Settings, LifeBuoy, LogIn, LogOut, ClipboardList, SlidersHorizontal } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useStore, ViewId, cartCount } from "@/lib/store";
import { dict } from "@/lib/i18n";
import { BrandLockup } from "@/components/shared/BrandLockup";
import { LogoutConfirmDialog } from "@/components/storefront/LogoutConfirmDialog";
import { BRAND_COLORS, getBrandAccentForeground } from "@/lib/brand-colors";
import { requestPrivacyPreferences } from "@/lib/privacy-consent";

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
    { id: "home", label: t.mobileNav.home, desktopLabel: locale === "fr" ? "Découvrir" : "Discover", purpose: locale === "fr" ? "Sélections et nouveautés" : "Selections and new arrivals", icon: Home, accent: BRAND_COLORS.earth },
    { id: "catalog", label: t.mobileNav.categories, desktopLabel: locale === "fr" ? "Acheter les produits" : "Shop products", purpose: locale === "fr" ? "Rayons, origine et disponibilité" : "Categories, origin and availability", icon: LayoutGrid, accent: BRAND_COLORS.burgundy },
    { id: "wholesale", label: locale === "fr" ? "Gros" : "Wholesale", desktopLabel: locale === "fr" ? "Marché de gros" : "Wholesale market", purpose: locale === "fr" ? "Cartons, lots et prix dégressifs" : "Cases, lots and tiered prices", icon: Boxes, accent: BRAND_COLORS.terracotta },
    { id: "recipes", label: t.mobileNav.recipes, desktopLabel: locale === "fr" ? "Cuisiner une recette" : "Cook a recipe", purpose: locale === "fr" ? "Personnaliser puis composer le panier" : "Customise and build the basket", icon: ChefHat, accent: BRAND_COLORS.gold },
    { id: "cart", label: t.mobileNav.cart, desktopLabel: locale === "fr" ? "Finaliser le panier" : "Complete basket", purpose: locale === "fr" ? "Quantités, livraison et total" : "Quantities, delivery and total", icon: ShoppingBag, accent: BRAND_COLORS.chilli },
  ];
  const accountItem = {
    id: "account" as ViewId,
    label: customer ? t.mobileNav.account : t.nav.login,
    desktopLabel: customer ? (locale === "fr" ? "Mon espace" : "My account") : t.nav.login,
    purpose: customer ? (locale === "fr" ? "Profil et préférences" : "Profile and preferences") : (locale === "fr" ? "Accéder à vos services" : "Access your services"),
    icon: customer ? User : LogIn,
    accent: BRAND_COLORS.warmCoral,
  };
  const mobileItems = [...publicItems.filter((item) => item.id !== "wholesale"), accountItem];
  const desktopGroups: Array<{ label: string; intent: string; items: ClientNavItem[] }> = [
    { label: locale === "fr" ? "Explorer" : "Explore", intent: locale === "fr" ? "Choisir" : "Choose", items: publicItems.filter((item) => item.id !== "cart") },
    {
      label: locale === "fr" ? "Mes achats" : "My shopping",
      intent: locale === "fr" ? "Finaliser" : "Complete",
      items: [
        publicItems.find((item) => item.id === "cart")!,
        ...(customer ? [{ id: "orders" as ViewId, label: t.orders.title, desktopLabel: locale === "fr" ? "Suivre mes commandes" : "Track my orders", purpose: locale === "fr" ? "Statut, colis et livraison" : "Status, parcels and delivery", icon: ClipboardList, accent: BRAND_COLORS.deepEarth }] : []),
      ],
    },
  ];

  const isActive = (id: ViewId) => view === id
    || (id === "catalog" && (view === "product" || view === "wholesale"))
    || (id === "recipes" && view === "recipe-config")
    || (id === "orders" && view === "order-tracking");

  const renderMobileItem = (it: (typeof mobileItems)[number]) => {
    const active = isActive(it.id);
    const Icon = it.icon;
    return (
      <button
        key={it.id}
        onClick={() => navigate(it.id)}
        className={`group relative isolate flex min-h-14 min-w-0 flex-col items-center justify-center gap-0.5 px-0.5 text-[9px] font-extrabold transition-colors ${
          active ? "text-terre" : "text-muted-foreground hover:text-charcoal"
        }`}
        aria-label={it.label}
        aria-current={active ? "page" : undefined}
        data-active={active ? "true" : "false"}
      >
        {active ? (
          <motion.span
            layoutId="client-mobile-nav-active"
            className="absolute inset-x-1.5 inset-y-1 -z-10 rounded-md border border-terre/15 bg-[linear-gradient(145deg,rgba(185,71,43,0.12),rgba(242,169,0,0.07))] shadow-[0_8px_22px_-18px_rgba(185,71,43,0.85)]"
            transition={{ type: "spring", stiffness: 460, damping: 38 }}
          />
        ) : null}
        <span className={`relative grid h-7 w-8 place-items-center rounded-md transition-transform duration-200 group-active:scale-95 ${active ? "text-terre" : "text-muted-foreground group-hover:text-charcoal"}`}>
          <Icon className={`h-[1.18rem] w-[1.18rem] ${active ? "stroke-[2.5]" : "stroke-[1.9]"}`} />
          {it.id === "cart" && count > 0 ? (
            <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full border border-white bg-burgundy px-1 text-[8px] font-black text-white">
              {count > 99 ? "99+" : count}
            </span>
          ) : null}
        </span>
        <span className="relative block max-w-full truncate leading-[1.05]">{it.label}</span>
        {active ? <span className="absolute bottom-1 h-0.5 w-4 rounded-full bg-gold" aria-hidden="true" /> : null}
      </button>
    );
  };

  return (
    <>
      <nav data-testid="mobile-navigation" className="jma-safe-bottom fixed bottom-0 left-0 right-0 z-40 isolate border-t border-burgundy/10 bg-white/[0.97] px-1 shadow-[0_-16px_34px_-28px_rgba(90,38,50,0.72)] backdrop-blur-xl md:hidden">
        <div className="mx-auto grid max-w-xl grid-cols-5">{mobileItems.map(renderMobileItem)}</div>
      </nav>

      <aside data-testid="client-sidebar" className="fixed inset-y-0 left-0 z-50 hidden w-64 flex-col border-r border-burgundy/10 bg-[#FFFCFA] text-charcoal shadow-[14px_0_42px_-36px_rgba(90,38,50,0.48)] md:flex">
        <div className="african-kente-stripe h-[3px] shrink-0" />
        <button onClick={() => navigate("home")} className="border-b border-burgundy/10 px-5 py-5 text-left transition hover:bg-burgundy/[0.035]" aria-label={locale === "fr" ? "Accueil" : "Home"}>
          <BrandLockup compact locale={locale} />
        </button>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {desktopGroups.map((group, groupIndex) => <div key={group.label} className={groupIndex ? "mt-3" : ""}>
            <div className="flex items-center px-3 pb-2"><p className="text-[9px] font-extrabold uppercase text-burgundy">{group.label}</p><span className="ml-auto text-[8px] font-bold uppercase text-terre">{group.intent}</span></div>
            <div className="space-y-1">{group.items.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.id);
              return (
                <button key={item.id} onClick={() => navigate(item.id)} aria-current={active ? "page" : undefined} data-active={active ? "true" : "false"} className={`group relative isolate flex min-h-[3.5rem] w-full items-center gap-3 overflow-hidden rounded-md px-3 text-left transition ${active ? "text-charcoal shadow-[0_12px_28px_-24px_rgba(90,38,50,0.75)]" : "text-charcoal hover:bg-burgundy/[0.045]"}`}>
                  {active ? <motion.span layoutId="client-desktop-nav-active" className="absolute inset-0 -z-10 border border-burgundy/10 bg-[linear-gradient(105deg,rgba(255,255,255,1),rgba(185,71,43,0.07))]" transition={{ type: "spring", stiffness: 420, damping: 38 }} /> : null}
                  {active ? <span className="absolute inset-y-2 left-0 w-0.5 rounded-r-full" style={{ backgroundColor: item.accent }} aria-hidden="true" /> : null}
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md transition-transform duration-200 group-hover:scale-[1.04]" style={{ backgroundColor: active ? item.accent : `${item.accent}16`, color: active ? getBrandAccentForeground(item.accent) : item.accent }}><Icon className={`h-[1.05rem] w-[1.05rem] ${active ? "stroke-[2.4]" : "stroke-2"}`} /></span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-xs font-extrabold">{item.desktopLabel}</span><span className="mt-0.5 block truncate text-[9px] leading-4 text-muted-foreground">{item.purpose}</span></span>
                  {item.id === "cart" && count > 0 ? <span className="grid h-5 min-w-5 place-items-center rounded-full bg-gold px-1 text-[10px] font-extrabold text-charcoal">{count}</span> : null}
                </button>
              );
            })}</div>
          </div>)}
        </nav>

        <div className="border-t border-burgundy/10 bg-white/70 p-2.5">
          {customer ? (
            <button type="button" onClick={() => navigate("account", { accountSection: "profile" })} className="mb-1 flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition hover:bg-burgundy/5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-terre text-xs font-extrabold text-white">{customer.firstName[0]}{customer.lastName[0] || ""}</span>
              <span className="min-w-0"><span className="block truncate text-xs font-bold text-charcoal">{customer.firstName} {customer.lastName}</span><span className="block truncate text-[10px] text-muted-foreground">{customer.email}</span></span>
            </button>
          ) : null}
          {customer ? <button onClick={() => navigate("account", { accountSection: "settings" })} className="flex min-h-9 w-full items-center gap-3 rounded-md px-3 text-left text-xs font-semibold text-muted-foreground transition hover:bg-burgundy/5 hover:text-burgundy"><Settings className="h-4 w-4" /> {locale === "fr" ? "Paramètres" : "Settings"}</button> : <button onClick={() => navigate("account")} className="flex min-h-9 w-full items-center gap-3 rounded-md px-3 text-left text-xs font-semibold text-muted-foreground transition hover:bg-burgundy/5 hover:text-burgundy"><LogIn className="h-4 w-4" /> {t.nav.login}</button>}
          <button onClick={() => navigate("info", { infoPage: "help" })} className="flex min-h-9 w-full items-center gap-3 rounded-md px-3 text-left text-xs font-semibold text-muted-foreground transition hover:bg-burgundy/5 hover:text-burgundy"><LifeBuoy className="h-4 w-4" /> {t.nav.help}</button>
          <button type="button" onClick={requestPrivacyPreferences} className="flex min-h-9 w-full items-center gap-3 rounded-md px-3 text-left text-xs font-semibold text-muted-foreground transition hover:bg-burgundy/5 hover:text-burgundy"><SlidersHorizontal className="h-4 w-4" /> {locale === "fr" ? "Confidentialité" : "Privacy"}</button>
          {customer ? (
            <LogoutConfirmDialog>
              <button className="flex min-h-9 w-full items-center gap-3 rounded-md px-3 text-left text-xs font-semibold text-terre transition hover:bg-terre/5"><LogOut className="h-4 w-4" /> {locale === "fr" ? "Se déconnecter" : "Sign out"}</button>
            </LogoutConfirmDialog>
          ) : null}
        </div>
      </aside>
    </>
  );
}
