import Image from "next/image";
import type { IconFunction } from "reicon/createIcon";
import { BoxTick } from "reicon/icons/BoxTick";
import { ChefHatHeart } from "reicon/icons/ChefHatHeart";
import { ShieldCheck } from "reicon/icons/ShieldCheck";
import { BrandLockup } from "@/components/shared/BrandLockup";
import { ReiconGlyph } from "@/components/ui/reicon-glyph";
import type { Locale } from "@/lib/i18n";

export function CustomerAuthVisualPanel({ locale, mode = "access" }: { locale: Locale; mode?: "access" | "reset" }) {
  const isFr = locale === "fr";
  const headline = mode === "reset"
    ? (isFr ? "Vos repères restent les vôtres." : "Everything you value stays yours.")
    : (isFr ? "Le goût voyage avec vous." : "Taste travels with you.");
  const signals: Array<{ icon: IconFunction; label: string }> = isFr
    ? [
        { icon: BoxTick, label: "Commandes suivies" },
        { icon: ChefHatHeart, label: "Recettes synchronisées" },
        { icon: ShieldCheck, label: "Accès protégé" },
      ]
    : [
        { icon: BoxTick, label: "Tracked orders" },
        { icon: ChefHatHeart, label: "Synced recipes" },
        { icon: ShieldCheck, label: "Protected access" },
      ];

  return (
    <section
      className="relative hidden min-h-0 overflow-hidden bg-burgundy lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16"
      aria-label={isFr ? "Univers culinaire Je mange Africain" : "Je mange Africain culinary world"}
      data-testid="customer-auth-visual"
    >
      <Image src="/hero-feast-v2.webp" alt="" fill sizes="58vw" loading="eager" fetchPriority="high" className="object-cover object-[64%_center]" />
      <div data-testid="customer-auth-overlay" className="absolute inset-0 bg-burgundy/45" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(90,38,50,0.82),rgba(185,71,43,0.38),rgba(242,169,0,0.08))]" />
      <BrandLockup size="large" inverse locale={locale} className="relative z-10" />
      <div className="relative z-10 max-w-xl text-white">
        <p className="text-[10px] font-black uppercase text-gold">{isFr ? "Sélection africaine contemporaine" : "Contemporary African selection"}</p>
        <p className="mt-5 max-w-lg font-display text-5xl font-semibold leading-[1.06] xl:text-6xl">{headline}</p>
      </div>
      <div className="relative z-10 grid grid-cols-3 divide-x divide-white/20 border-t border-white/22 pt-5 text-cream/88">
        {signals.map((signal) => <div key={signal.label} className="min-w-0 px-3 first:pl-0 last:pr-0"><ReiconGlyph icon={signal.icon} weight="Filled" className="h-4 w-4 text-gold" /><p className="mt-2 text-[10px] font-bold leading-4">{signal.label}</p></div>)}
      </div>
    </section>
  );
}
