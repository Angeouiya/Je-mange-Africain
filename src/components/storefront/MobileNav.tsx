"use client";

import { motion } from "framer-motion";
import type { IconFunction } from "reicon/createIcon";
import { BasketShopping } from "reicon/icons/BasketShopping";
import { Box } from "reicon/icons/Box";
import { BoxSearch } from "reicon/icons/BoxSearch";
import { Building2 } from "reicon/icons/Building2";
import { ChefHatHeart } from "reicon/icons/ChefHatHeart";
import { ClipboardList } from "reicon/icons/ClipboardList";
import { Home } from "reicon/icons/Home";
import { Lifebuoy } from "reicon/icons/Lifebuoy";
import { Login } from "reicon/icons/Login";
import { Logout } from "reicon/icons/Logout";
import { Settings2 } from "reicon/icons/Settings2";
import { Sliders } from "reicon/icons/Sliders";
import { UserCircle } from "reicon/icons/UserCircle";
import { useStore, ViewId, cartCount } from "@/lib/store";
import { dict } from "@/lib/i18n";
import { BrandLockup } from "@/components/shared/BrandLockup";
import { LogoutConfirmDialog } from "@/components/storefront/LogoutConfirmDialog";
import { BRAND_COLORS } from "@/lib/brand-colors";
import { requestPrivacyPreferences } from "@/lib/privacy-consent";
import { clientPrimaryNavigationTarget, clientSidebarUtilityTarget } from "@/lib/client-navigation";
import { COMPANY_PROFILE } from "@/lib/company-profile";
import { prefetchStorefrontData, storefrontPredictiveTargets, storefrontWarmupPlan } from "@/lib/storefront-prefetch";
import { ReiconGlyph } from "@/components/ui/reicon-glyph";
import { preloadStorefrontViewBundle } from "@/components/storefront/view-loaders";

export function MobileNav({ ready = true }: { ready?: boolean }) {
  const locale = useStore((s) => s.locale);
  const view = useStore((s) => s.view);
  const params = useStore((s) => s.params);
  const navigate = useStore((s) => s.navigate);
  const cart = useStore((s) => s.cart);
  const customer = useStore((s) => s.customer);
  const t = dict[locale];
  const count = customer ? cartCount(cart) : 0;

  type ClientNavItem = { id: ViewId; label: string; desktopLabel: string; purpose: string; icon: IconFunction; accent: string };
  const publicItems: ClientNavItem[] = [
    { id: "home", label: t.mobileNav.home, desktopLabel: locale === "fr" ? "Découvrir" : "Discover", purpose: locale === "fr" ? "Sélections et nouveautés" : "Selections and new arrivals", icon: Home, accent: BRAND_COLORS.earth },
    { id: "catalog", label: t.mobileNav.categories, desktopLabel: locale === "fr" ? "Marché alimentaire" : "Food market", purpose: locale === "fr" ? "Détail, gros, origine et disponibilité" : "Retail, wholesale, origin and availability", icon: BoxSearch, accent: BRAND_COLORS.burgundy },
    { id: "wholesale", label: locale === "fr" ? "Gros" : "Wholesale", desktopLabel: locale === "fr" ? "Marché de gros" : "Wholesale market", purpose: locale === "fr" ? "Cartons, lots et prix dégressifs" : "Cases, lots and tiered prices", icon: Box, accent: BRAND_COLORS.terracotta },
    { id: "recipes", label: t.mobileNav.recipes, desktopLabel: locale === "fr" ? "Cuisiner une recette" : "Cook a recipe", purpose: locale === "fr" ? "Personnaliser puis composer le panier" : "Customise and build the basket", icon: ChefHatHeart, accent: BRAND_COLORS.gold },
    { id: "cart", label: t.mobileNav.cart, desktopLabel: locale === "fr" ? "Finaliser le panier" : "Complete basket", purpose: locale === "fr" ? "Quantités, livraison et total" : "Quantities, delivery and total", icon: BasketShopping, accent: BRAND_COLORS.chilli },
  ];
  const accountItem = {
    id: "account" as ViewId,
    label: customer ? t.mobileNav.account : t.nav.login,
    desktopLabel: customer ? (locale === "fr" ? "Mon espace" : "My account") : t.nav.login,
    purpose: customer ? (locale === "fr" ? "Profil et préférences" : "Profile and preferences") : (locale === "fr" ? "Accéder à vos services" : "Access your services"),
    icon: customer ? UserCircle : Login,
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
  const mobileActiveTarget = clientPrimaryNavigationTarget(view, "mobile", Boolean(customer));
  const desktopActiveTarget = clientPrimaryNavigationTarget(view, "desktop", Boolean(customer));
  const utilityActiveTarget = clientSidebarUtilityTarget(view, params);
  const warmDestination = (destination: ViewId) => {
    for (const target of storefrontWarmupPlan(storefrontPredictiveTargets(destination).slice(0, 4), Boolean(customer))) {
      void preloadStorefrontViewBundle(target.bundleView);
      if (target.prefetchData) {
        void prefetchStorefrontData(target.view, target.params, locale);
      }
    }
  };

  const renderMobileItem = (it: (typeof mobileItems)[number]) => {
    const active = mobileActiveTarget === it.id;
    return (
      <button
        key={it.id}
        disabled={!ready}
        onClick={() => navigate(it.id)}
        onPointerEnter={() => warmDestination(it.id)}
        onFocus={() => warmDestination(it.id)}
        onTouchStart={() => warmDestination(it.id)}
        className={`group relative isolate flex min-h-14 min-w-0 flex-col items-center justify-center gap-0.5 px-0.5 text-[9px] font-extrabold transition-colors ${
          active ? "text-burgundy" : "text-muted-foreground hover:text-charcoal"
        } disabled:pointer-events-none disabled:opacity-65`}
        aria-label={it.label}
        aria-current={active ? "page" : undefined}
        aria-disabled={!ready}
        data-active={active ? "true" : "false"}
      >
        {active ? (
          <motion.span
            layoutId="client-mobile-nav-active"
            className="absolute inset-x-1.5 inset-y-1 -z-10 rounded-md border border-burgundy/14 bg-white shadow-[0_8px_22px_-19px_rgba(90,38,50,0.55)]"
            transition={{ type: "spring", stiffness: 460, damping: 38 }}
          />
        ) : null}
        <span className={`relative grid h-7 w-8 place-items-center rounded-md transition-transform duration-200 group-active:scale-95 ${active ? "text-burgundy" : "text-muted-foreground group-hover:text-charcoal"}`}>
          <ReiconGlyph icon={it.icon} weight={active ? "Filled" : "Outline"} className="h-[1.18rem] w-[1.18rem]" />
          {it.id === "cart" && count > 0 ? (
            <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full border border-white bg-burgundy px-1 text-[8px] font-black text-white">
              {count > 99 ? "99+" : count}
            </span>
          ) : null}
        </span>
        <span className="relative block max-w-full truncate leading-[1.05]">{it.label}</span>
        {active ? <span className="absolute bottom-1 h-0.5 w-4 rounded-full bg-burgundy" aria-hidden="true" /> : null}
      </button>
    );
  };

  return (
    <>
      <nav data-testid="mobile-navigation" className="jma-safe-bottom fixed bottom-0 left-0 right-0 z-40 isolate border-t border-burgundy/10 bg-white/[0.97] px-1 shadow-[0_-16px_34px_-28px_rgba(90,38,50,0.72)] backdrop-blur-xl md:hidden">
        <div className="mx-auto grid max-w-xl grid-cols-5">{mobileItems.map(renderMobileItem)}</div>
      </nav>

      <aside data-testid="client-sidebar" className="fixed inset-y-0 left-0 z-50 hidden w-64 flex-col border-r border-burgundy/10 bg-white text-charcoal shadow-[14px_0_42px_-36px_rgba(90,38,50,0.42)] md:flex">
        <div className="african-kente-stripe h-[3px] shrink-0" />
        <button disabled={!ready} onClick={() => navigate("home")} onPointerEnter={() => warmDestination("home")} onFocus={() => warmDestination("home")} className="border-b border-burgundy/10 px-5 py-5 text-left transition hover:bg-burgundy/[0.035] disabled:pointer-events-none disabled:opacity-65" aria-label={locale === "fr" ? "Accueil" : "Home"} aria-disabled={!ready}>
          <BrandLockup compact locale={locale} />
        </button>

        <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          {desktopGroups.map((group, groupIndex) => <div key={group.label} className={groupIndex ? "mt-3" : ""}>
            <div className="flex items-center px-3 pb-2"><p className="text-[9px] font-extrabold uppercase text-burgundy">{group.label}</p><span className="ml-auto text-[8px] font-bold uppercase text-burgundy">{group.intent}</span></div>
            <div className="space-y-1">{group.items.map((item) => {
              const active = desktopActiveTarget === item.id;
              return (
                <button key={item.id} disabled={!ready} onClick={() => navigate(item.id)} onPointerEnter={() => warmDestination(item.id)} onFocus={() => warmDestination(item.id)} aria-current={active ? "page" : undefined} aria-disabled={!ready} data-active={active ? "true" : "false"} className={`group relative isolate flex min-h-12 w-full items-center gap-3 overflow-hidden rounded-md px-3 text-left transition disabled:pointer-events-none disabled:opacity-65 ${active ? "text-charcoal shadow-[0_12px_28px_-24px_rgba(90,38,50,0.75)]" : "text-charcoal hover:bg-burgundy/[0.045]"}`}>
                  {active ? <motion.span layoutId="client-desktop-nav-active" className="absolute inset-0 -z-10 border border-burgundy/12 bg-white shadow-[0_12px_28px_-24px_rgba(90,38,50,0.52)]" transition={{ type: "spring", stiffness: 420, damping: 38 }} /> : null}
                  {active ? <span className="absolute inset-y-2 left-0 w-0.5 rounded-r-full" style={{ backgroundColor: item.accent }} aria-hidden="true" /> : null}
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md transition-transform duration-200 group-hover:scale-[1.04]" style={{ backgroundColor: active ? BRAND_COLORS.burgundy : `${BRAND_COLORS.burgundy}10`, color: active ? "#FFFFFF" : BRAND_COLORS.burgundy }}><ReiconGlyph icon={item.icon} weight={active ? "Filled" : "Outline"} className="h-[1.05rem] w-[1.05rem]" /></span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-xs font-extrabold">{item.desktopLabel}</span><span className="mt-0.5 block truncate text-[9px] leading-4 text-muted-foreground">{item.purpose}</span></span>
                  {item.id === "cart" && count > 0 ? <span className="grid h-5 min-w-5 place-items-center rounded-full bg-burgundy px-1 text-[10px] font-extrabold text-white">{count}</span> : null}
                </button>
              );
            })}</div>
          </div>)}
        </nav>

        <div className="border-t border-burgundy/10 bg-white/70 p-2.5">
          {customer ? (
            <button
              type="button"
              disabled={!ready}
              onClick={() => navigate("account", { accountSection: "profile" })}
              aria-current={utilityActiveTarget === "account" ? "page" : undefined}
              aria-disabled={!ready}
              data-active={utilityActiveTarget === "account" ? "true" : "false"}
              className={`mb-1 flex w-full items-center gap-3 rounded-md border px-2 py-2 text-left transition disabled:pointer-events-none disabled:opacity-65 ${utilityActiveTarget === "account" ? "border-burgundy/10 bg-burgundy/[0.06] shadow-[0_10px_24px_-22px_rgba(90,38,50,0.75)]" : "border-transparent hover:bg-burgundy/5"}`}
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-burgundy text-xs font-extrabold text-white">{customer.firstName[0]}{customer.lastName[0] || ""}</span>
              <span className="min-w-0"><span className="block truncate text-xs font-bold text-charcoal">{customer.firstName} {customer.lastName}</span><span className="block truncate text-[10px] text-muted-foreground">{customer.email}</span></span>
            </button>
          ) : null}
          {customer ? (
            <button
              type="button"
              disabled={!ready}
              onClick={() => navigate("account", { accountSection: "settings" })}
              aria-current={utilityActiveTarget === "settings" ? "page" : undefined}
              aria-disabled={!ready}
              data-active={utilityActiveTarget === "settings" ? "true" : "false"}
              className={`flex min-h-9 w-full items-center gap-3 rounded-md px-3 text-left text-xs font-semibold transition disabled:pointer-events-none disabled:opacity-65 ${utilityActiveTarget === "settings" ? "bg-burgundy/[0.07] text-burgundy" : "text-muted-foreground hover:bg-burgundy/5 hover:text-burgundy"}`}
            >
              <ReiconGlyph icon={Settings2} className="h-4 w-4" /> {locale === "fr" ? "Paramètres" : "Settings"}
            </button>
          ) : (
            <button type="button" disabled={!ready} onClick={() => navigate("account")} aria-disabled={!ready} className="flex min-h-9 w-full items-center gap-3 rounded-md px-3 text-left text-xs font-semibold text-muted-foreground transition hover:bg-burgundy/5 hover:text-burgundy disabled:pointer-events-none disabled:opacity-65"><ReiconGlyph icon={Login} className="h-4 w-4" /> {t.nav.login}</button>
          )}
          <button
            type="button"
            disabled={!ready}
            onClick={() => navigate("info", { infoPage: "help" })}
            aria-current={utilityActiveTarget === "help" ? "page" : undefined}
            aria-disabled={!ready}
            data-active={utilityActiveTarget === "help" ? "true" : "false"}
            className={`flex min-h-9 w-full items-center gap-3 rounded-md px-3 text-left text-xs font-semibold transition disabled:pointer-events-none disabled:opacity-65 ${utilityActiveTarget === "help" ? "bg-burgundy/[0.07] text-burgundy" : "text-muted-foreground hover:bg-burgundy/5 hover:text-burgundy"}`}
          >
            <ReiconGlyph icon={Lifebuoy} className="h-4 w-4" /> {t.nav.help}
          </button>
          <button
            type="button"
            onClick={requestPrivacyPreferences}
            aria-current={utilityActiveTarget === "privacy" ? "page" : undefined}
            data-active={utilityActiveTarget === "privacy" ? "true" : "false"}
            className={`flex min-h-9 w-full items-center gap-3 rounded-md px-3 text-left text-xs font-semibold transition ${utilityActiveTarget === "privacy" ? "bg-burgundy/[0.07] text-burgundy" : "text-muted-foreground hover:bg-burgundy/5 hover:text-burgundy"}`}
          >
            <ReiconGlyph icon={Sliders} className="h-4 w-4" /> {locale === "fr" ? "Confidentialité" : "Privacy"}
          </button>
          {customer ? (
            <LogoutConfirmDialog>
              <button className="flex min-h-9 w-full items-center gap-3 rounded-md px-3 text-left text-xs font-semibold text-burgundy transition hover:bg-burgundy/5"><ReiconGlyph icon={Logout} className="h-4 w-4" /> {locale === "fr" ? "Se déconnecter" : "Sign out"}</button>
            </LogoutConfirmDialog>
          ) : null}
          <p className="mt-2 flex items-center gap-2 border-t border-burgundy/8 px-3 pt-2 text-[9px] font-bold leading-4 text-muted-foreground">
            <ReiconGlyph icon={Building2} className="h-3.5 w-3.5 shrink-0 text-burgundy" />
            <span>{locale === "fr" ? "Créée par" : "Created by"} {COMPANY_PROFILE.legalName}</span>
          </p>
        </div>
      </aside>
    </>
  );
}
