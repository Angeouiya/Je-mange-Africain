import type { ReactNode } from "react";
import type { IconFunction, IconWeight } from "reicon/createIcon";
import { BasketShopping } from "reicon/icons/BasketShopping";
import { ChartBar } from "reicon/icons/ChartBar";
import { ChefHat } from "reicon/icons/ChefHat";
import { Loader } from "reicon/icons/Loader";
import { ShieldCheck } from "reicon/icons/ShieldCheck";
import { Sparkles } from "reicon/icons/Sparkles";
import { TruckFast } from "reicon/icons/TruckFast";
import { ReiconGlyph } from "@/components/ui/reicon-glyph";
import { cn } from "@/lib/utils";
import type { Locale } from "@/lib/i18n";

type PremiumLoadingContext = "client" | "admin";
type PremiumLoadingDensity = "view" | "section" | "auth";

type PremiumLoadingFrameProps = {
  locale?: Locale;
  label?: string;
  context?: PremiumLoadingContext;
  density?: PremiumLoadingDensity;
  testId?: string;
  className?: string;
  brand?: ReactNode;
};

type LoadingSignal = {
  icon: IconFunction;
  accent: string;
  labelFr: string;
  labelEn: string;
  weight?: IconWeight;
};

const CLIENT_SIGNALS: LoadingSignal[] = [
  { icon: ChefHat, accent: "#B9472B", labelFr: "Cuisine", labelEn: "Kitchen", weight: "Filled" },
  { icon: BasketShopping, accent: "#8A3042", labelFr: "Panier", labelEn: "Basket" },
  { icon: TruckFast, accent: "#F2A900", labelFr: "Livraison", labelEn: "Delivery" },
];

const ADMIN_SIGNALS: LoadingSignal[] = [
  { icon: ChartBar, accent: "#B9472B", labelFr: "Pilotage", labelEn: "Control", weight: "Filled" },
  { icon: ShieldCheck, accent: "#8A3042", labelFr: "Accès", labelEn: "Access" },
  { icon: TruckFast, accent: "#F2A900", labelFr: "Flux", labelEn: "Flow" },
];

const COPY = {
  client: {
    eyebrow: { fr: "Je mange Africain", en: "Je mange Africain" },
    title: { fr: "Préparation de votre marché", en: "Preparing your market" },
    description: { fr: "Produits, recettes et livraison se synchronisent.", en: "Products, recipes and delivery are syncing." },
  },
  admin: {
    eyebrow: { fr: "Console professionnelle", en: "Professional console" },
    title: { fr: "Synchronisation de l'espace", en: "Synchronising workspace" },
    description: { fr: "Données, droits et indicateurs se mettent en place.", en: "Data, permissions and indicators are getting ready." },
  },
} as const;

export function PremiumLoadingFrame({
  locale = "fr",
  label,
  context = "client",
  density = "view",
  testId,
  className,
  brand,
}: PremiumLoadingFrameProps) {
  const isFr = locale === "fr";
  const copy = COPY[context];
  const signals = context === "admin" ? ADMIN_SIGNALS : CLIENT_SIGNALS;
  const statusLabel = label || (isFr ? "Chargement de l'espace" : "Loading workspace");
  const tileCount = density === "auth" ? 3 : 4;

  const rootClassName = cn(
    density === "auth"
      ? "grid min-h-dvh place-items-center bg-white px-4 py-8 sm:px-6"
      : context === "admin"
        ? "mx-auto w-full max-w-[100rem] py-1"
        : "mx-auto w-full max-w-7xl px-4 py-5 md:px-7 md:py-8 lg:px-8",
    className,
  );

  return (
    <section
      className={rootClassName}
      role="status"
      aria-live="polite"
      aria-label={statusLabel}
      data-testid={testId}
      data-context={context}
      data-density={density}
    >
      <div className={cn("w-full", density === "auth" ? "max-w-xl" : "")}>
        {brand ? <div className="mb-7 flex justify-center">{brand}</div> : null}
        <div className="overflow-hidden border-y border-burgundy/10 bg-[#FFFCFA] shadow-[0_24px_70px_-54px_rgba(90,38,50,0.72)]">
          <div className="h-[3px] bg-[linear-gradient(90deg,#B9472B_0%,#F2A900_54%,#D65A32_100%)]" aria-hidden="true" />
          <div className={cn("grid gap-4 px-4 py-4 sm:px-5", density === "auth" ? "sm:py-5" : "sm:grid-cols-[minmax(0,1fr)_16rem]")}>
            <div className="flex min-w-0 items-start gap-3">
              <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-md border border-terre/12 bg-[linear-gradient(145deg,rgba(185,71,43,0.12),rgba(242,169,0,0.08))] text-terre shadow-[0_18px_34px_-28px_rgba(185,71,43,0.82)]">
                <span className="absolute inset-2 rounded border border-terre/20" aria-hidden="true" />
                <ReiconGlyph icon={Sparkles} weight="Filled" className="h-4 w-4 animate-pulse" />
              </span>
              <span className="min-w-0 flex-1 pt-0.5">
                <span className="inline-flex min-h-5 max-w-full items-center gap-1.5 rounded bg-burgundy/[0.055] px-2 text-[9px] font-black uppercase leading-4 text-burgundy">
                  <ReiconGlyph icon={Loader} className="h-3 w-3 animate-spin text-terre" />
                  <span className="truncate">{statusLabel}</span>
                </span>
                <span className="mt-2 block text-[9px] font-black uppercase text-terre">{copy.eyebrow[locale]}</span>
                <span className="mt-1 block font-display text-[1.35rem] font-semibold leading-tight text-charcoal sm:text-[1.7rem]">{copy.title[locale]}</span>
                <span className="mt-1 block text-xs leading-5 text-muted-foreground">{copy.description[locale]}</span>
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-1" aria-hidden="true">
              {signals.map((signal) => (
                <span key={signal.labelFr} className="flex min-h-12 min-w-0 items-center gap-2 rounded-md border border-charcoal/8 bg-white px-2 shadow-[0_12px_28px_-24px_rgba(90,38,50,0.5)]">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md" style={{ backgroundColor: `${signal.accent}14`, color: signal.accent }}>
                    <ReiconGlyph icon={signal.icon} weight={signal.weight || "Outline"} className="h-3.5 w-3.5" />
                  </span>
                  <span className="hidden min-w-0 flex-1 sm:block">
                    <span className="block truncate text-[9px] font-black text-charcoal">{isFr ? signal.labelFr : signal.labelEn}</span>
                    <span className="mt-1.5 block h-2 w-2/3 animate-pulse rounded bg-terre/10" />
                  </span>
                </span>
              ))}
            </div>
          </div>
          <div className={cn("grid gap-2 border-t border-charcoal/8 bg-white px-4 py-4 sm:px-5", density === "auth" ? "grid-cols-3" : "grid-cols-2 md:grid-cols-4")}>
            {Array.from({ length: tileCount }).map((_, index) => (
              <span key={index} className="min-h-28 overflow-hidden rounded-md border border-charcoal/8 bg-white shadow-[0_16px_36px_-30px_rgba(90,38,50,0.62)]" aria-hidden="true">
                <span className="block h-2 bg-[linear-gradient(90deg,#B9472B,#F2A900)] opacity-80" />
                <span className="block space-y-3 p-3">
                  <span className="block h-8 w-8 animate-pulse rounded-md bg-terre/10" />
                  <span className="block h-4 w-3/4 animate-pulse rounded bg-charcoal/8" />
                  <span className="block h-2.5 w-full animate-pulse rounded bg-terre/10" />
                  <span className="block h-2.5 w-2/3 animate-pulse rounded bg-burgundy/10" />
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
