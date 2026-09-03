"use client";

import { BookOpen, ChefHat, Clock, Flame, MapPin, Search, ShieldAlert, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProductImage } from "@/components/shared/ProductImage";
import { getRecipePhoto } from "@/lib/market-media";
import { useStore } from "@/lib/store";

export type DishLibraryItem = {
  slug: string;
  name: string;
  aliases: string[];
  country: string;
  region: string;
  category: string;
  categoryLabel: string;
  difficulty: "easy" | "medium" | "hard";
  timeMinutes: number;
  servings: number;
  featured: boolean;
  description: string;
  tradition: string;
  service: string;
  allergens: string[];
  tags: string[];
  recommendationScore: number;
  ingredients: Array<{ name: string; quantity: string; role: string; optional: boolean }>;
  steps: string[];
};

export function DishLibraryCard({ dish, onSelect, compact = false, index = 0 }: { dish: DishLibraryItem; onSelect: (dish: DishLibraryItem) => void; compact?: boolean; index?: number }) {
  const locale = useStore((state) => state.locale);
  const difficulty = dish.difficulty === "easy"
    ? locale === "fr" ? "Facile" : "Easy"
    : dish.difficulty === "hard"
      ? locale === "fr" ? "Expert" : "Advanced"
      : locale === "fr" ? "Intermédiaire" : "Intermediate";
  const photo = getRecipePhoto({ name: dish.name, title: dish.name, country: dish.country, category: dish.categoryLabel });

  return (
    <article className={`group flex h-full flex-col overflow-hidden border border-border bg-card transition hover:-translate-y-0.5 hover:shadow-lg ${compact ? "rounded-md [contain-intrinsic-size:390px] [content-visibility:auto]" : "rounded-lg"}`}>
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <ProductImage src={photo} alt={dish.name} emoji="🍽️" color="#8A3042" size="lg" priority={index < 2} className="h-full w-full transition duration-500 group-hover:scale-[1.03]" rounded="rounded-none" />
        <Badge className={`absolute border-0 bg-charcoal/85 text-white backdrop-blur ${compact ? "bottom-2 left-2 px-1.5 py-0.5 text-[8px]" : "left-3 top-3"}`}>{dish.country}</Badge>
        {dish.featured ? <Badge className={`absolute border-0 bg-gold text-charcoal ${compact ? "right-2 top-2 px-1.5 py-0.5 text-[8px]" : "right-3 top-3"}`}>{locale === "fr" ? "Incontournable" : "Essential"}</Badge> : null}
      </div>
      <div className={`flex flex-1 flex-col ${compact ? "p-2.5" : "p-4"}`}>
        <p className={`${compact ? "text-[8px]" : "text-[10px] tracking-wider"} truncate font-bold uppercase text-terre`}>{dish.categoryLabel} · {dish.region}</p>
        <h3 className={`${compact ? "mt-1 line-clamp-2 min-h-7 text-[12px]" : "mt-1 text-base"} font-extrabold leading-snug text-charcoal`}>{dish.name}</h3>
        <p className={`${compact ? "mt-1 line-clamp-2 min-h-8 text-[10px] leading-4" : "mt-2 line-clamp-2 text-xs leading-5"} text-muted-foreground`}>{dish.description}</p>
        <div className={`${compact ? "mt-2 gap-x-2 text-[10px]" : "mt-3 gap-x-3 text-[11px]"} flex flex-wrap gap-y-1 text-muted-foreground`}>
          <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {dish.timeMinutes} min</span>
          <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> {dish.servings}</span>
          <span className={`${compact ? "hidden sm:inline-flex" : "inline-flex"} items-center gap-1`}><Flame className="h-3 w-3" /> {difficulty}</span>
        </div>
        <Button onClick={() => onSelect(dish)} variant="outline" aria-label={locale === "fr" ? `Voir la fiche complète de ${dish.name}` : `View the full record for ${dish.name}`} className={`${compact ? "mt-2 h-8 px-2 text-[10px]" : "mt-4"} w-full border-forest text-forest hover:bg-forest hover:text-white`}>
          <BookOpen className={`${compact ? "mr-1 h-3.5 w-3.5" : "mr-2 h-4 w-4"}`} /> {compact ? (locale === "fr" ? "Voir la fiche" : "View record") : (locale === "fr" ? "Voir la fiche complète" : "View full dish")}
        </Button>
      </div>
    </article>
  );
}

export function DishDetailsDialog({ dish, onClose }: { dish: DishLibraryItem | null; onClose: () => void }) {
  const locale = useStore((state) => state.locale);
  const navigate = useStore((state) => state.navigate);

  return (
    <Dialog open={Boolean(dish)} onOpenChange={(open) => { if (!open) onClose(); }}>
      {dish ? (
        <DialogContent className="max-h-[92vh] overflow-y-auto p-0 sm:max-w-4xl">
          <div className="relative aspect-[16/6] min-h-52 overflow-hidden rounded-t-lg bg-muted">
            <ProductImage src={getRecipePhoto({ name: dish.name, title: dish.name, country: dish.country, category: dish.categoryLabel })} alt={dish.name} emoji="🍽️" color="#8A3042" size="lg" className="h-full w-full" rounded="rounded-none" />
            <div className="absolute inset-0 bg-gradient-to-t from-charcoal/85 via-charcoal/10 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-7">
              <p className="text-xs font-bold uppercase tracking-wider text-gold">{dish.country} · {dish.region}</p>
              <DialogHeader className="mt-1 text-left">
                <DialogTitle className="text-2xl font-extrabold sm:text-3xl">{dish.name}</DialogTitle>
                <DialogDescription className="max-w-2xl whitespace-normal break-words pr-6 text-xs leading-5 text-white/80 sm:text-sm">{dish.description}</DialogDescription>
              </DialogHeader>
            </div>
          </div>

          <div className="space-y-6 p-5 sm:p-7">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <DetailMetric icon={Clock} label={locale === "fr" ? "Temps" : "Time"} value={`${dish.timeMinutes} min`} />
              <DetailMetric icon={Users} label={locale === "fr" ? "Portions" : "Servings"} value={String(dish.servings)} />
              <DetailMetric icon={ChefHat} label={locale === "fr" ? "Niveau" : "Level"} value={dish.difficulty} />
              <DetailMetric icon={MapPin} label={locale === "fr" ? "Origine" : "Origin"} value={dish.country} />
            </div>

            <div className="rounded-lg border-l-4 border-gold bg-gold/5 p-4">
              <p className="text-xs font-extrabold uppercase tracking-wider text-charcoal">{locale === "fr" ? "Repère culturel" : "Cultural note"}</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{dish.tradition}</p>
            </div>

            <div className="grid gap-7 lg:grid-cols-[0.85fr_1.15fr]">
              <section>
                <h4 className="text-base font-extrabold text-charcoal">{locale === "fr" ? "Ingrédients" : "Ingredients"}</h4>
                <p className="mt-1 text-xs text-muted-foreground">{dish.servings} {locale === "fr" ? "personnes" : "servings"}</p>
                <div className="mt-3 divide-y divide-border rounded-lg border border-border">
                  {dish.ingredients.map((item, index) => (
                    <div key={`${item.name}-${index}`} className="flex items-start gap-3 px-3 py-2.5 text-sm">
                      <span className="w-20 shrink-0 font-bold text-terre">{item.quantity}</span>
                      <span className="flex-1 text-charcoal">{item.name}</span>
                      {item.optional ? <span className="text-[10px] text-muted-foreground">{locale === "fr" ? "facultatif" : "optional"}</span> : null}
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h4 className="text-base font-extrabold text-charcoal">{locale === "fr" ? "Préparation" : "Preparation"}</h4>
                <ol className="mt-3 space-y-3">
                  {dish.steps.map((step, index) => (
                    <li key={index} className="flex gap-3">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-forest text-xs font-bold text-white">{index + 1}</span>
                      <p className="pt-0.5 text-sm leading-6 text-charcoal">{step}</p>
                    </li>
                  ))}
                </ol>
              </section>
            </div>

            <div className="rounded-lg bg-forest/5 p-4">
              <p className="text-xs font-extrabold uppercase tracking-wider text-forest">{locale === "fr" ? "Conseil de service" : "Serving note"}</p>
              <p className="mt-1 text-sm leading-6 text-charcoal">{dish.service}</p>
            </div>

            {dish.allergens.length > 0 ? (
              <div className="flex items-start gap-2 rounded-md border border-gold/40 bg-gold/[0.09] p-3 text-xs leading-5 text-charcoal">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <span><strong>{locale === "fr" ? "Allergènes à contrôler :" : "Allergens to check:"}</strong> {dish.allergens.join(", ")}. {locale === "fr" ? "Vérifiez toujours les étiquettes des produits utilisés." : "Always check the labels of the products used."}</span>
              </div>
            ) : null}

            <Button onClick={() => navigate("catalog", { query: dish.ingredients[0]?.name || dish.name })} className="w-full bg-terre text-white hover:bg-terre-dark sm:w-auto">
              <Search className="mr-2 h-4 w-4" /> {locale === "fr" ? "Trouver les ingrédients" : "Find ingredients"}
            </Button>
          </div>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}

function DetailMetric({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <Icon className="h-4 w-4 text-terre" />
      <p className="mt-2 text-[10px] font-semibold uppercase text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate text-xs font-bold capitalize text-charcoal">{value}</p>
    </div>
  );
}
