"use client";

import Image from "next/image";
import { Mail, Phone, MapPin, Facebook, Instagram, Youtube, Send } from "lucide-react";
import { useStore, ViewId } from "@/lib/store";
import { dict } from "@/lib/i18n";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function Footer() {
  const locale = useStore((s) => s.locale);
  const navigate = useStore((s) => s.navigate);
  const t = dict[locale];

  const go = (view: ViewId, params?: any) => navigate(view, params);

  const subscribe = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success(locale === "fr" ? "Merci ! Vous êtes inscrit·e." : "Thanks! You're subscribed.");
    (e.target as HTMLFormElement).reset();
  };

  const shopLinks: [string, ViewId, any?][] = [
    [t.nav.catalog, "catalog", {}],
    [t.nav.recipes, "recipes", {}],
    [t.home.bestsellers, "catalog", {}],
    [t.home.onSale, "catalog", {}],
  ];
  const helpLinks: [string, ViewId, any?][] = [
    [t.footer.faq, "info", { infoPage: "help" }],
    [t.footer.contactUs, "info", { infoPage: "contact" }],
    [t.nav.tracking, "orders", {}],
    [t.footer.about, "info", { infoPage: "about" }],
  ];
  const legalLinks: [string, ViewId, any?][] = [
    [t.footer.cgv, "info", { infoPage: "cgv" }],
    [t.footer.privacy, "info", { infoPage: "privacy" }],
    [t.footer.cookies, "info", { infoPage: "cookies" }],
    [t.footer.delivery, "info", { infoPage: "delivery" }],
  ];

  return (
    <footer className="mt-auto bg-charcoal text-cream">
      <div className="african-kente-stripe h-1.5" />
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-2 lg:grid-cols-4 lg:px-6">
        {/* about */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Image src="/logo-jma.png" alt="Je mange Africain" width={120} height={120} className="h-16 w-16 object-contain" />
            <div>
              <p className="text-base font-extrabold text-cream">Je mange Africain</p>
              <p className="text-xs font-semibold uppercase tracking-wide text-gold">Épicerie mobile</p>
            </div>
          </div>
          <p className="text-sm text-cream/70">{t.footer.aboutDesc}</p>
          <div className="flex gap-2 pt-2">
            <a href="#" onClick={(e) => e.preventDefault()} aria-label="Facebook" className="grid h-8 w-8 place-items-center rounded-full bg-cream/10 transition hover:bg-terre"><Facebook className="h-4 w-4" /></a>
            <a href="#" onClick={(e) => e.preventDefault()} aria-label="Instagram" className="grid h-8 w-8 place-items-center rounded-full bg-cream/10 transition hover:bg-terre"><Instagram className="h-4 w-4" /></a>
            <a href="#" onClick={(e) => e.preventDefault()} aria-label="Youtube" className="grid h-8 w-8 place-items-center rounded-full bg-cream/10 transition hover:bg-terre"><Youtube className="h-4 w-4" /></a>
          </div>
        </div>

        {/* shop */}
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gold">{t.footer.shop}</h3>
          <ul className="space-y-2 text-sm text-cream/80">
            {shopLinks.map(([label, view, params]) => (
              <li key={label}><button onClick={() => go(view, params)} className="transition hover:text-gold hover:underline">{label}</button></li>
            ))}
          </ul>
        </div>

        {/* help */}
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gold">{t.footer.help}</h3>
          <ul className="space-y-2 text-sm text-cream/80">
            {helpLinks.map(([label, view, params]) => (
              <li key={label}><button onClick={() => go(view, params)} className="transition hover:text-gold hover:underline">{label}</button></li>
            ))}
          </ul>
          <div className="mt-3 space-y-1 text-xs text-cream/60">
            <p className="flex items-center gap-2"><Phone className="h-3 w-3" /> +33 1 80 00 00 00</p>
            <p className="flex items-center gap-2"><Mail className="h-3 w-3" /> bonjour@jemangeafricain.fr</p>
            <p className="flex items-center gap-2"><MapPin className="h-3 w-3" /> Paris, France</p>
          </div>
        </div>

        {/* newsletter + legal */}
        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gold">{t.footer.newsletter}</h3>
          <p className="mb-2 text-xs text-cream/70">{t.footer.newsletterDesc}</p>
          <form onSubmit={subscribe} className="flex gap-2">
            <Input type="email" required placeholder={t.footer.emailPlaceholder} className="border-cream/20 bg-cream/10 text-cream placeholder:text-cream/40" />
            <Button type="submit" size="icon" className="bg-terre text-cream hover:bg-terre-dark" aria-label={t.footer.subscribe}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
          <ul className="mt-4 space-y-1.5 text-xs text-cream/60">
            {legalLinks.map(([label, view, params]) => (
              <li key={label}><button onClick={() => go(view, params)} className="transition hover:text-gold hover:underline">{label}</button></li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-cream/10 py-4 text-center text-xs text-cream/50">
        © {new Date().getFullYear()} Je mange Africain — {t.footer.rights}
      </div>
    </footer>
  );
}
