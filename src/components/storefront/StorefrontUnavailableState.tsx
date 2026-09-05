"use client";

import { CloudOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type Surface = "home" | "catalog" | "recipes" | "library";

const copy: Record<Surface, { title: [string, string]; description: [string, string] }> = {
  home: {
    title: ["La sélection se resynchronise", "The selection is resyncing"],
    description: ["Les produits et recettes sont momentanément indisponibles. Votre panier et vos favoris restent intacts.", "Products and recipes are temporarily unavailable. Your basket and favourites remain intact."],
  },
  catalog: {
    title: ["Le marché est momentanément indisponible", "The market is temporarily unavailable"],
    description: ["Nous n'avons pas pu actualiser les prix et les stocks. Relancez la synchronisation avant de choisir un produit.", "We could not refresh prices and stock. Retry the synchronisation before choosing a product."],
  },
  recipes: {
    title: ["Les recettes ne peuvent pas encore être affichées", "Recipes cannot be displayed yet"],
    description: ["La bibliothèque achetable n'a pas pu être synchronisée avec le stock. Vous pouvez relancer sans perdre vos filtres.", "The shoppable library could not be synchronised with stock. You can retry without losing your filters."],
  },
  library: {
    title: ["L'atlas culinaire est momentanément indisponible", "The culinary atlas is temporarily unavailable"],
    description: ["Les fiches détaillées n'ont pas pu être chargées. Votre recherche reste en place pendant la reprise.", "Detailed records could not be loaded. Your search remains in place while you retry."],
  },
};

export function StorefrontUnavailableState({ surface, locale, onRetry, className = "" }: { surface: Surface; locale: "fr" | "en"; onRetry: () => void; className?: string }) {
  const languageIndex = locale === "fr" ? 0 : 1;
  const content = copy[surface];
  return (
    <section role="alert" className={`flex min-h-64 flex-col items-center justify-center border-y border-burgundy/15 bg-[#FFFCFA] px-5 py-12 text-center ${className}`} data-testid={`storefront-${surface}-unavailable`}>
      <span className="grid h-14 w-14 place-items-center rounded-lg border border-terre/12 bg-terre/[0.06] text-terre"><CloudOff className="h-6 w-6" strokeWidth={1.8} /></span>
      <p className="mt-3 text-[9px] font-black uppercase text-terre">{locale === "fr" ? "Synchronisation interrompue" : "Synchronisation interrupted"}</p>
      <h2 className="mt-1 max-w-lg font-display text-xl font-semibold text-charcoal sm:text-2xl">{content.title[languageIndex]}</h2>
      <p className="mt-2 max-w-lg text-xs leading-5 text-muted-foreground sm:text-sm sm:leading-6">{content.description[languageIndex]}</p>
      <Button type="button" variant="outline" onClick={onRetry} className="mt-5 border-terre/25 bg-white text-terre hover:bg-terre/[0.05] hover:text-terre"><RefreshCw className="mr-2 h-4 w-4" />{locale === "fr" ? "Réessayer" : "Try again"}</Button>
    </section>
  );
}
