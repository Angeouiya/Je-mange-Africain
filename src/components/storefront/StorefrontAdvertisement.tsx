"use client";

import { useId } from "react";
import Image from "next/image";
import { ArrowRight, BadgePercent, ChefHat, ShoppingBasket, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { advertisementDestination } from "@/lib/advertising";
import { useStore, type ViewId, type ViewParams } from "@/lib/store";
import { useFetch } from "@/lib/use-fetch";

export type AdvertisementPlacement = "home" | "catalog" | "recipes" | "checkout";
export type StorefrontAdvertisementVariant = "immersive" | "ribbon" | "compact";

export type StorefrontAdvertisementData = {
  id?: string;
  placement?: AdvertisementPlacement;
  imageUrl?: string | null;
  imageAlt?: string | null;
  title?: string | null;
  body?: string | null;
  linkUrl?: string | null;
};

type Props = {
  placement: AdvertisementPlacement;
  variant?: StorefrontAdvertisementVariant;
  fallback?: StorefrontAdvertisementData;
  fallbackDestination?: { view: ViewId; params?: ViewParams };
  className?: string;
};

const PLACEMENT_ICON = {
  home: Sparkles,
  catalog: BadgePercent,
  recipes: ChefHat,
  checkout: ShoppingBasket,
} as const;

type ArtworkProps = {
  advertisement: StorefrontAdvertisementData;
  placement: AdvertisementPlacement;
  variant?: StorefrontAdvertisementVariant;
  locale: "fr" | "en";
  className?: string;
  edgeToEdgeMobile?: boolean;
  showAction?: boolean;
  onActivate?: () => void;
  testId?: string;
};

export function StorefrontAdvertisementArtwork({ advertisement, placement, variant = "ribbon", locale, className = "", edgeToEdgeMobile = false, showAction = false, onActivate, testId }: ArtworkProps) {
  const headingId = useId();
  const isImmersive = variant === "immersive";
  const isCompact = variant === "compact";
  const Icon = PLACEMENT_ICON[placement];
  const labels = locale === "fr"
    ? {
        home: "Recette intelligente",
        catalog: "Sélection du marché",
        recipes: "Inspiration culinaire",
        checkout: "Avantage commande",
        action: placement === "catalog" ? "Voir la sélection" : placement === "checkout" ? "Voir l’avantage" : "Découvrir",
      }
    : {
        home: "Smart recipe",
        catalog: "Market selection",
        recipes: "Culinary inspiration",
        checkout: "Order benefit",
        action: placement === "catalog" ? "View selection" : placement === "checkout" ? "View benefit" : "Discover",
      };
  const actionClassName = isImmersive
    ? "mt-4 h-9 bg-white px-3 text-burgundy hover:bg-cream md:h-10 md:px-4"
    : "mt-2.5 h-8 bg-burgundy px-2.5 text-[10px] text-white hover:bg-burgundy/90";

  return (
    <section
      aria-labelledby={headingId}
      data-testid={testId}
      data-advertisement-id={advertisement.id}
      data-advertisement-variant={variant}
      className={`relative isolate overflow-hidden border border-burgundy/10 ${edgeToEdgeMobile ? "-mx-4 md:mx-0" : ""} ${isImmersive ? "min-h-48 md:min-h-64 md:rounded-lg" : isCompact ? "min-h-[7.5rem] rounded-lg" : "min-h-[9.5rem] rounded-lg"} ${className}`}
    >
      <Image
        src={advertisement.imageUrl || "/hero.jpg"}
        alt={advertisement.imageAlt || ""}
        fill
        sizes={isImmersive ? "(max-width: 768px) 100vw, 1200px" : "(max-width: 768px) 100vw, 960px"}
        className={`object-cover ${isImmersive ? "object-center" : "object-right"}`}
      />
      <div className={`absolute inset-0 ${isImmersive ? "bg-gradient-to-r from-burgundy/94 via-burgundy/72 to-terre/20" : "bg-gradient-to-r from-white via-white/95 via-60% to-white/20"}`} />
      <div className={`relative flex flex-col items-start justify-center ${isImmersive ? "min-h-48 justify-end p-5 text-white md:min-h-64 md:justify-center md:p-9" : isCompact ? "min-h-[7.5rem] max-w-[84%] p-3.5 sm:max-w-[70%] sm:p-4" : "min-h-[9.5rem] max-w-[86%] p-4 sm:max-w-[68%] sm:p-5"}`}>
        <span className={`inline-flex items-center gap-1.5 text-[9px] font-black uppercase ${isImmersive ? "text-gold" : "text-terre"}`}><Icon className="h-3.5 w-3.5" />{labels[placement]}</span>
        <h2 id={headingId} className={`mt-1 line-clamp-2 font-display font-semibold leading-tight ${isImmersive ? "max-w-xl text-xl md:text-3xl" : isCompact ? "text-base text-charcoal sm:text-lg" : "text-lg text-charcoal sm:text-xl"}`}>{advertisement.title}</h2>
        {advertisement.body ? <p className={`mt-1.5 line-clamp-2 leading-4 ${isImmersive ? "max-w-lg text-[11px] text-white/82 md:text-sm md:leading-5" : "max-w-xl text-[10px] text-charcoal/68 sm:text-xs"}`}>{advertisement.body}</p> : null}
        {showAction ? onActivate ? (
          <Button type="button" onClick={onActivate} className={actionClassName}>{labels.action}<ArrowRight className="ml-1 h-3.5 w-3.5" /></Button>
        ) : (
          <span aria-hidden="true" className={`inline-flex items-center justify-center rounded-md font-semibold ${actionClassName}`}>{labels.action}<ArrowRight className="ml-1 h-3.5 w-3.5" /></span>
        ) : null}
      </div>
    </section>
  );
}

export function StorefrontAdvertisement({ placement, variant = "ribbon", fallback, fallbackDestination, className = "" }: Props) {
  const locale = useStore((state) => state.locale);
  const navigate = useStore((state) => state.navigate);
  const { data } = useFetch<{ advertisements: StorefrontAdvertisementData[] }>(`/api/advertisements?placement=${placement}&locale=${locale}`, [locale, placement]);
  const advertisement = data?.advertisements?.[0] || fallback;

  if (!advertisement) return null;

  const openDestination = () => {
    const destination = advertisementDestination(advertisement.linkUrl);
    if (destination?.kind === "storefront") {
      navigate(destination.view, destination.params);
      return;
    }
    if (destination?.kind === "url") {
      if (destination.external) window.open(destination.href, "_blank", "noopener,noreferrer");
      else window.location.assign(destination.href);
      return;
    }
    if (fallbackDestination) navigate(fallbackDestination.view, fallbackDestination.params);
  };

  return <StorefrontAdvertisementArtwork advertisement={advertisement} placement={placement} variant={variant} locale={locale} className={className} edgeToEdgeMobile={variant === "immersive"} showAction={Boolean(advertisement.linkUrl || fallbackDestination)} onActivate={openDestination} testId={`advertisement-${placement}`} />;
}
