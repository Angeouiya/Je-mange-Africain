import Image from "next/image";
import { BrandLockup } from "@/components/shared/BrandLockup";
import type { Locale } from "@/lib/i18n";

export function CustomerAuthVisualPanel({ locale, mode = "access" }: { locale: Locale; mode?: "access" | "reset" }) {
  const isFr = locale === "fr";
  const headline = mode === "reset"
    ? (isFr ? "Vos repères restent les vôtres." : "Everything you value stays yours.")
    : (isFr ? "Le goût voyage avec vous." : "Taste travels with you.");

  return (
    <section
      className="relative hidden min-h-0 overflow-hidden bg-charcoal lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16"
      aria-label={isFr ? "Univers culinaire Je mange Africain" : "Je mange Africain culinary world"}
      data-testid="customer-auth-visual"
    >
      <Image src="/hero-feast-v2.webp" alt="" fill sizes="58vw" loading="lazy" className="object-cover object-[64%_center]" />
      <div className="absolute inset-0 bg-charcoal/55" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(63,41,48,0.82),rgba(90,38,50,0.34),rgba(185,71,43,0.08))]" />
      <BrandLockup size="large" inverse locale={locale} className="relative z-10" />
      <div className="relative z-10 max-w-xl text-white">
        <p className="text-[10px] font-black uppercase text-gold">{isFr ? "Sélection africaine contemporaine" : "Contemporary African selection"}</p>
        <p className="mt-5 max-w-lg font-display text-5xl font-semibold leading-[1.06] xl:text-6xl">{headline}</p>
      </div>
      <p className="relative z-10 border-t border-white/22 pt-5 text-xs font-bold text-cream/82">{isFr ? "Cuisine · Épicerie · Transmission" : "Food · Groceries · Heritage"}</p>
    </section>
  );
}
