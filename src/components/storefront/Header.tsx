"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu, ShoppingBag, User, Package, LayoutDashboard, ChevronDown,
  MapPin, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useStore, cartCount } from "@/lib/store";
import { dict } from "@/lib/i18n";
import { SearchBar } from "@/components/shared/SearchBar";
import { LanguageSwitch } from "@/components/shared/LanguageSwitch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function Header() {
  const locale = useStore((s) => s.locale);
  const navigate = useStore((s) => s.navigate);
  const cart = useStore((s) => s.cart);
  const customer = useStore((s) => s.customer);
  const login = useStore((s) => s.login);
  const country = useStore((s) => s.country);
  const postalCode = useStore((s) => s.postalCode);
  const setDeliveryContext = useStore((s) => s.setDeliveryContext);
  const t = dict[locale];
  const count = cartCount(cart);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [countryDraft, setCountryDraft] = useState(country);
  const [postalDraft, setPostalDraft] = useState(postalCode);

  const navLinks: { key: string; view: any; label: string }[] = [
    { key: "catalog", view: "catalog", label: t.nav.catalog },
    { key: "recipes", view: "recipes", label: t.nav.recipes },
    { key: "orders", view: "orders", label: t.nav.tracking },
  ];

  const go = (view: any, params?: any) => {
    navigate(view, params);
    setMobileOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-cream/90 backdrop-blur-md">
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
          <SheetContent side="left" className="w-80 bg-cream p-0">
            <SheetHeader className="border-b border-border p-4">
              <SheetTitle className="text-left">
                <img src={locale === "fr" ? "/logo.svg" : "/logo.svg"} alt="Je mange Africain" className="h-9 w-auto" />
              </SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col p-2">
              {navLinks.map((l) => (
                <button key={l.key} onClick={() => go(l.view)} className="rounded-lg px-3 py-3 text-left text-sm font-medium text-charcoal hover:bg-muted">
                  {l.label}
                </button>
              ))}
              <button onClick={() => go("account")} className="rounded-lg px-3 py-3 text-left text-sm font-medium text-charcoal hover:bg-muted">
                {t.nav.account}
              </button>
              <button onClick={() => go("info", { infoPage: "about" })} className="rounded-lg px-3 py-3 text-left text-sm font-medium text-charcoal hover:bg-muted">
                {t.nav.about}
              </button>
              <button onClick={() => go("info", { infoPage: "help" })} className="rounded-lg px-3 py-3 text-left text-sm font-medium text-charcoal hover:bg-muted">
                {t.nav.help}
              </button>
              <button onClick={() => go("info", { infoPage: "contact" })} className="rounded-lg px-3 py-3 text-left text-sm font-medium text-charcoal hover:bg-muted">
                {t.nav.contact}
              </button>
              <button onClick={() => go("admin")} className="mt-2 flex items-center gap-2 rounded-lg bg-charcoal px-3 py-3 text-left text-sm font-medium text-cream hover:bg-charcoal/90">
                <LayoutDashboard className="h-4 w-4" /> {t.nav.admin}
              </button>
              <div className="mt-4 border-t border-border pt-3">
                <LanguageSwitch />
              </div>
            </nav>
          </SheetContent>
        </Sheet>

        {/* logo */}
        <button onClick={() => go("home")} className="flex items-center" aria-label="Accueil">
          <img src="/logo.svg" alt="Je mange Africain" className="hidden h-9 w-auto sm:block" />
          <img src="/icon.svg" alt="Je mange Africain" className="h-9 w-9 sm:hidden" />
        </button>

        {/* desktop nav */}
        <nav className="ml-2 hidden items-center gap-1 md:flex">
          {navLinks.map((l) => (
            <button key={l.key} onClick={() => go(l.view)} className="rounded-lg px-3 py-2 text-sm font-medium text-charcoal transition hover:bg-muted hover:text-terre">
              {l.label}
            </button>
          ))}
        </nav>

        {/* search */}
        <div className="ml-auto hidden flex-1 max-w-md lg:block">
          <SearchBar />
        </div>

        {/* delivery context (desktop) */}
        <Popover>
          <PopoverTrigger asChild>
            <button className="hidden items-center gap-1 rounded-full border border-border bg-card px-3 py-2 text-xs text-charcoal transition hover:bg-muted xl:flex">
              <MapPin className="h-3.5 w-3.5 text-terre" />
              <span className="max-w-20 truncate">{postalCode} {country}</span>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64 bg-popover" align="end">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-charcoal">{t.header.deliverTo}</p>
              <select value={countryDraft} onChange={(e) => setCountryDraft(e.target.value)} className="w-full rounded-lg border border-border bg-background px-2 py-2 text-sm">
                <option>France</option><option>Belgique</option><option>Luxembourg</option><option>Suisse</option>
              </select>
              <Input value={postalDraft} onChange={(e) => setPostalDraft(e.target.value)} placeholder={t.header.postalCode} className="text-sm" />
              <Button size="sm" className="w-full bg-terre text-cream hover:bg-terre-dark" onClick={() => setDeliveryContext(countryDraft, postalDraft)}>
                {t.confirm}
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <LanguageSwitch compact />

        {/* account */}
        <Button variant="ghost" size="icon" aria-label={t.nav.account} onClick={() => go(customer ? "account" : "account")}>
          <User className="h-5 w-5" />
        </Button>

        {/* cart */}
        <Button variant="ghost" size="icon" aria-label={t.nav.cart} onClick={() => go("cart")} className="relative">
          <ShoppingBag className="h-5 w-5" />
          {count > 0 && (
            <AnimatePresence>
              <motion.span
                key={count}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-terre px-1 text-[10px] font-bold text-cream"
              >
                {count}
              </motion.span>
            </AnimatePresence>
          )}
        </Button>

        {/* admin (desktop) */}
        <Button variant="outline" size="sm" onClick={() => go("admin")} className="hidden border-charcoal text-charcoal hover:bg-charcoal hover:text-cream md:inline-flex">
          <LayoutDashboard className="mr-1 h-4 w-4" /> {t.nav.admin}
        </Button>
      </div>

      {/* mobile search row */}
      <div className="border-t border-border px-3 pb-2 pt-2 lg:hidden">
        <SearchBar />
      </div>
    </header>
  );
}
