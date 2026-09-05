"use client";

import Image from "next/image";
import { Globe2, Mail, SlidersHorizontal } from "lucide-react";
import { useStore, ViewId } from "@/lib/store";
import { dict } from "@/lib/i18n";
import { requestPrivacyPreferences } from "@/lib/privacy-consent";

export function Footer() {
  const locale = useStore((s) => s.locale);
  const navigate = useStore((s) => s.navigate);
  const customer = useStore((s) => s.customer);
  const t = dict[locale];

  const go = (view: ViewId, params?: any) => navigate(view, params);

  const shopLinks: [string, ViewId, any?][] = [
    [t.nav.catalog, "catalog", {}],
    [locale === "fr" ? "Marché de gros" : "Wholesale market", "wholesale", {}],
    [t.nav.recipes, "recipes", {}],
    [t.home.bestsellers, "catalog", {}],
    [t.home.onSale, "catalog", {}],
  ];
  const helpLinks: [string, ViewId, any?][] = [
    [t.footer.faq, "info", { infoPage: "help" }],
    [t.footer.contactUs, "info", { infoPage: "contact" }],
    [t.nav.tracking, customer ? "orders" : "account", {}],
    [t.footer.about, "info", { infoPage: "about" }],
  ];
  const legalLinks: [string, ViewId, any?][] = [
    [t.footer.cgv, "info", { infoPage: "cgv" }],
    [t.footer.privacy, "info", { infoPage: "privacy" }],
    [t.footer.cookies, "info", { infoPage: "cookies" }],
    [t.footer.delivery, "info", { infoPage: "delivery" }],
  ];

  return (
    <footer className="mt-auto border-t border-burgundy/10 bg-[#FFF8F4] text-charcoal">
      <div className="african-kente-stripe h-1.5" />
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-9 md:grid-cols-[1.15fr_0.85fr_1fr] lg:px-6">
        {/* about */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Image src="/brand/logo-mark-burgundy.png" alt="Je mange Africain" width={120} height={120} className="h-16 w-16 object-contain" />
            <div>
              <p className="text-base font-extrabold text-charcoal">Je mange Africain</p>
              <p className="text-xs font-semibold uppercase text-terre">Épicerie mobile</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{t.footer.aboutDesc}</p>
          <div className="space-y-1.5 pt-2 text-xs text-muted-foreground"><a href="mailto:bonjour@je-mange-africain.com" className="flex items-center gap-2 transition hover:text-terre"><Mail className="h-3.5 w-3.5" /> bonjour@je-mange-africain.com</a><a href="https://je-mange-africain.com" className="flex items-center gap-2 transition hover:text-terre"><Globe2 className="h-3.5 w-3.5" /> je-mange-africain.com</a></div>
        </div>

        {/* shop */}
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase text-burgundy">{t.footer.shop}</h3>
          <ul className="space-y-2 text-sm text-charcoal/80">
            {shopLinks.map(([label, view, params]) => (
              <li key={label}><button onClick={() => go(view, params)} className="transition hover:text-terre hover:underline">{label}</button></li>
            ))}
          </ul>
        </div>

        {/* help */}
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase text-burgundy">{t.footer.help}</h3>
          <ul className="space-y-2 text-sm text-charcoal/80">
            {helpLinks.map(([label, view, params]) => (
              <li key={label}><button onClick={() => go(view, params)} className="transition hover:text-terre hover:underline">{label}</button></li>
            ))}
          </ul>
          <h3 className="mb-3 mt-6 text-sm font-semibold uppercase text-burgundy">{locale === "fr" ? "Cadre légal" : "Legal"}</h3>
          <ul className="space-y-1.5 text-xs text-muted-foreground">
            {legalLinks.map(([label, view, params]) => (
              <li key={label}><button onClick={() => go(view, params)} className="transition hover:text-terre hover:underline">{label}</button></li>
            ))}
            <li><button type="button" onClick={requestPrivacyPreferences} className="inline-flex items-center gap-1.5 font-bold text-burgundy transition hover:text-terre hover:underline"><SlidersHorizontal className="h-3.5 w-3.5" />{locale === "fr" ? "Gérer mes choix" : "Manage my choices"}</button></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-burgundy/10 bg-white/45 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Je mange Africain · {t.footer.rights}
      </div>
    </footer>
  );
}
