"use client";

import { useState } from "react";
import {
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "@/components/ui/sheet";
import { useStore } from "@/lib/store";
import { dict } from "@/lib/i18n";
import { SearchBar } from "@/components/shared/SearchBar";
import { LanguageSwitch } from "@/components/shared/LanguageSwitch";
import { NotificationCenter } from "@/components/storefront/NotificationCenter";
import { BrandLockup } from "@/components/shared/BrandLockup";

export function Header() {
  const locale = useStore((s) => s.locale);
  const navigate = useStore((s) => s.navigate);
  const t = dict[locale];
  const [mobileOpen, setMobileOpen] = useState(false);

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
          <SheetContent side="left" className="w-80 bg-cream p-0">
            <SheetHeader className="border-b border-border p-4">
              <SheetTitle className="text-left">
                <BrandLockup />
              </SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col p-2">
              {navLinks.map((l) => (
                <button key={l.key} onClick={() => go(l.view)} className="rounded-lg px-3 py-3 text-left text-sm font-medium text-charcoal hover:bg-muted">
                  {l.label}
                </button>
              ))}
              <button onClick={() => go("info", { infoPage: "about" })} className="rounded-lg px-3 py-3 text-left text-sm font-medium text-charcoal hover:bg-muted">
                {t.nav.about}
              </button>
              <button onClick={() => go("info", { infoPage: "help" })} className="rounded-lg px-3 py-3 text-left text-sm font-medium text-charcoal hover:bg-muted">
                {t.nav.help}
              </button>
              <button onClick={() => go("info", { infoPage: "contact" })} className="rounded-lg px-3 py-3 text-left text-sm font-medium text-charcoal hover:bg-muted">
                {t.nav.contact}
              </button>
              <div className="mt-2 border-t border-border pt-2">
                <button onClick={() => go("info", { infoPage: "privacy" })} className="block w-full rounded-lg px-3 py-2 text-left text-xs font-medium text-muted-foreground hover:bg-muted hover:text-charcoal">
                  {locale === "fr" ? "Politique de confidentialité" : "Privacy policy"}
                </button>
                <button onClick={() => go("info", { infoPage: "cgv" })} className="block w-full rounded-lg px-3 py-2 text-left text-xs font-medium text-muted-foreground hover:bg-muted hover:text-charcoal">
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

        <div className="hidden min-w-0 flex-1 md:block"><div className="max-w-2xl"><SearchBar /></div></div>
        <div className="ml-auto md:hidden" />
        <LanguageSwitch compact />

        <NotificationCenter />
      </div>

      {/* mobile search row */}
      <div className="border-t border-border/70 px-3 pb-2 pt-2 md:hidden">
        <div className="mx-auto max-w-2xl"><SearchBar /></div>
      </div>
    </header>
  );
}
