"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import {
  ChefHat,
  CircleHelp,
  ClipboardList,
  Info,
  LogIn,
  LogOut,
  Menu,
  MessageCircle,
  ScrollText,
  ShieldCheck,
  Store,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "@/components/ui/sheet";
import { useStore } from "@/lib/store";
import { dict } from "@/lib/i18n";
import { SearchBar } from "@/components/shared/SearchBar";
import { LanguageSwitch } from "@/components/shared/LanguageSwitch";
import { BrandLockup } from "@/components/shared/BrandLockup";
import { LogoutConfirmDialog } from "@/components/storefront/LogoutConfirmDialog";

const NotificationCenter = dynamic(
  () => import("@/components/storefront/NotificationCenter").then((module) => module.NotificationCenter),
  { loading: () => <span className="h-10 w-10" aria-hidden="true" /> }
);

export function Header() {
  const locale = useStore((s) => s.locale);
  const view = useStore((s) => s.view);
  const navigate = useStore((s) => s.navigate);
  const customer = useStore((s) => s.customer);
  const t = dict[locale];
  const [mobileOpen, setMobileOpen] = useState(false);
  const searchContext = view === "catalog"
    ? { icon: Store, label: locale === "fr" ? "Catalogue" : "Catalogue", detail: locale === "fr" ? "Produits et ingrédients" : "Products and ingredients" }
    : view === "recipes"
      ? { icon: ChefHat, label: locale === "fr" ? "Cuisine" : "Cooking", detail: locale === "fr" ? "Recettes et bibliothèque" : "Recipes and dish library" }
      : null;

  const utilityLinks = [
    ...(customer ? [{ key: "orders", view: "orders", params: undefined, label: t.nav.tracking, icon: ClipboardList }] : []),
    { key: "about", view: "info", params: { infoPage: "about" }, label: t.nav.about, icon: Info },
    { key: "help", view: "info", params: { infoPage: "help" }, label: t.nav.help, icon: CircleHelp },
    { key: "contact", view: "info", params: { infoPage: "contact" }, label: t.nav.contact, icon: MessageCircle },
  ];

  const go = (view: any, params?: any) => {
    navigate(view, params);
    setMobileOpen(false);
  };
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-white/90 backdrop-blur-xl">
      {/* kente stripe */}
      <div className="african-kente-stripe h-1" />
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-3 md:px-6">
        {/* mobile menu */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden" aria-label="Menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[min(21rem,calc(100vw-2rem))] bg-cream p-0">
            <SheetHeader className="border-b border-border p-4">
              <SheetTitle className="text-left">
                <BrandLockup />
              </SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col p-3" aria-label={locale === "fr" ? "Assistance et informations" : "Help and information"}>
              <p className="px-3 pb-2 text-[10px] font-extrabold uppercase text-muted-foreground">{locale === "fr" ? "Mon espace" : "My space"}</p>
              <button
                type="button"
                onClick={() => go("account", customer ? { accountSection: "profile" } : undefined)}
                className="flex min-h-12 items-center gap-3 rounded-md px-3 text-left text-sm font-bold text-charcoal hover:bg-muted"
                aria-label={customer ? (locale === "fr" ? "Ouvrir mon espace" : "Open my account") : t.nav.login}
              >
                <span className="grid h-8 w-8 place-items-center rounded-md bg-terre text-white">
                  {customer ? <UserRound className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
                </span>
                <span className="min-w-0">
                  <span className="block truncate">{customer ? (locale === "fr" ? "Mon espace" : "My account") : t.nav.login}</span>
                  <span className="mt-0.5 block truncate text-[10px] font-medium text-muted-foreground">
                    {customer
                      ? (locale === "fr" ? "Profil, préférences et commandes" : "Profile, preferences and orders")
                      : (locale === "fr" ? "Retrouver vos services personnels" : "Access your personal services")}
                  </span>
                </span>
              </button>
              {customer ? (
                <LogoutConfirmDialog>
                  <button type="button" className="flex min-h-11 items-center gap-3 rounded-md px-3 text-left text-xs font-bold text-destructive hover:bg-red-50">
                    <LogOut className="h-4 w-4" /> {locale === "fr" ? "Se déconnecter" : "Sign out"}
                  </button>
                </LogoutConfirmDialog>
              ) : null}
              <div className="my-3 border-t border-border" />
              <p className="px-3 pb-2 text-[10px] font-extrabold uppercase text-muted-foreground">{locale === "fr" ? "À votre service" : "At your service"}</p>
              {utilityLinks.map((link) => (
                <button key={link.key} onClick={() => go(link.view, link.params)} aria-label={link.label} className="flex min-h-12 items-center gap-3 rounded-md px-3 text-left text-sm font-bold text-charcoal hover:bg-muted">
                  <span className="grid h-8 w-8 place-items-center rounded-md bg-white text-terre"><link.icon className="h-4 w-4" /></span>
                  {link.label}
                </button>
              ))}
              <div className="mt-3 border-t border-border pt-3">
                <p className="px-3 pb-2 text-[10px] font-extrabold uppercase text-muted-foreground">{locale === "fr" ? "Cadre de confiance" : "Trust centre"}</p>
                <button onClick={() => go("info", { infoPage: "privacy" })} className="flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-left text-xs font-bold text-muted-foreground hover:bg-muted hover:text-charcoal">
                  <ShieldCheck className="h-4 w-4" />
                  {locale === "fr" ? "Politique de confidentialité" : "Privacy policy"}
                </button>
                <button onClick={() => go("info", { infoPage: "cgv" })} className="flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-left text-xs font-bold text-muted-foreground hover:bg-muted hover:text-charcoal">
                  <ScrollText className="h-4 w-4" />
                  {locale === "fr" ? "Conditions générales" : "Terms and conditions"}
                </button>
              </div>
              <div className="mt-4 border-t border-border pt-3">
                <LanguageSwitch />
              </div>
            </nav>
          </SheetContent>
        </Sheet>

        {/* logo */}
        <button onClick={() => go("home")} className="flex items-center gap-2 md:hidden" aria-label="Accueil">
          <BrandLockup compact responsive />
        </button>

        <div className="hidden min-w-0 flex-1 md:block">
          {searchContext ? (
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-md bg-terre/10 text-terre"><searchContext.icon className="h-4 w-4" /></span>
              <div className="min-w-0"><p className="text-xs font-black text-charcoal">{searchContext.label}</p><p className="mt-0.5 text-[10px] text-muted-foreground">{searchContext.detail}</p></div>
            </div>
          ) : <div className="max-w-2xl"><SearchBar /></div>}
        </div>
        <div className="ml-auto md:hidden" />
        <LanguageSwitch compact />

        <NotificationCenter />
      </div>

      {/* mobile search row */}
      {!searchContext ? (
        <div className="border-t border-border/70 px-3 pb-2 pt-2 md:hidden">
          <div className="mx-auto max-w-2xl"><SearchBar /></div>
        </div>
      ) : null}
    </header>
  );
}
