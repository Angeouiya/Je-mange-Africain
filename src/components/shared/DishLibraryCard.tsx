"use client";

import type { IconFunction } from "reicon/createIcon";
import { AlertTriangle } from "reicon/icons/AlertTriangle";
import { BookOpen } from "reicon/icons/BookOpen";
import { ChefHat } from "reicon/icons/ChefHat";
import { Clock } from "reicon/icons/Clock";
import { Eye } from "reicon/icons/Eye";
import { Flame } from "reicon/icons/Flame";
import { HelpCircle } from "reicon/icons/HelpCircle";
import { Hourglass } from "reicon/icons/Hourglass";
import { Lifebuoy } from "reicon/icons/Lifebuoy";
import { Lightbulb } from "reicon/icons/Lightbulb";
import { ListCheck } from "reicon/icons/ListCheck";
import { MapPoint } from "reicon/icons/MapPoint";
import { RollingPin } from "reicon/icons/RollingPin";
import { Search } from "reicon/icons/Search";
import { ShieldAlert } from "reicon/icons/ShieldAlert";
import { Thermometer } from "reicon/icons/Thermometer";
import { Timer } from "reicon/icons/Timer";
import { UserHands } from "reicon/icons/UserHands";
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
import { ReiconGlyph } from "@/components/ui/reicon-glyph";
import { getRecipePhoto } from "@/lib/market-media";
import { useStore } from "@/lib/store";
import { buildRecipeStepGuides } from "@/lib/recipe-step-guide";
import { ingredientsForPreparationStep } from "@/lib/recipe-step-ingredients";

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
    <article className={`group flex h-full flex-col overflow-hidden border border-burgundy/10 bg-white shadow-[0_16px_42px_-34px_rgba(90,38,50,0.65)] transition hover:-translate-y-0.5 hover:border-terre/24 hover:shadow-[0_24px_62px_-38px_rgba(90,38,50,0.82)] ${compact ? "rounded-md [contain-intrinsic-size:390px] [content-visibility:auto]" : "rounded-lg"}`}>
      <div className="relative aspect-[4/3] overflow-hidden bg-cream">
        <ProductImage src={photo} alt={dish.name} emoji="🍽️" color="#8A3042" size="lg" priority={index < 2} className="h-full w-full transition duration-500 group-hover:scale-[1.03]" rounded="rounded-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-burgundy/32 via-transparent to-transparent opacity-80" />
        <Badge className={`absolute border border-white/40 bg-burgundy/92 text-white shadow-sm backdrop-blur ${compact ? "bottom-2 left-2 px-1.5 py-0.5 text-[8px]" : "left-3 top-3"}`}>{dish.country}</Badge>
        {dish.featured ? <Badge className={`absolute border border-white/50 bg-gold text-charcoal shadow-sm ${compact ? "right-2 top-2 px-1.5 py-0.5 text-[8px]" : "right-3 top-3"}`}>{locale === "fr" ? "Incontournable" : "Essential"}</Badge> : null}
      </div>
      <div className={`flex flex-1 flex-col ${compact ? "p-2.5" : "p-4"}`}>
        <p className={`${compact ? "text-[8px]" : "text-[10px] tracking-wider"} truncate font-bold uppercase text-terre`}>{dish.categoryLabel} · {dish.region}</p>
        <h3 className={`${compact ? "mt-1 line-clamp-2 min-h-7 text-[12px]" : "mt-1 text-base"} font-extrabold leading-snug text-charcoal`}>{dish.name}</h3>
        <p className={`${compact ? "mt-1 line-clamp-2 min-h-8 text-[10px] leading-4" : "mt-2 line-clamp-2 text-xs leading-5"} text-muted-foreground`}>{dish.description}</p>
        <div className={`${compact ? "mt-2 gap-x-2 text-[10px]" : "mt-3 gap-x-3 text-[11px]"} flex flex-wrap gap-y-1 text-muted-foreground`}>
          <span className="inline-flex items-center gap-1"><ReiconGlyph icon={Clock} className="h-3 w-3 text-terre" /> {dish.timeMinutes} min</span>
          <span className="inline-flex items-center gap-1"><ReiconGlyph icon={UserHands} className="h-3 w-3 text-burgundy" /> {dish.servings}</span>
          <span className={`${compact ? "hidden sm:inline-flex" : "inline-flex"} items-center gap-1`}><ReiconGlyph icon={Flame} className="h-3 w-3 text-gold" /> {difficulty}</span>
        </div>
        <Button onClick={() => onSelect(dish)} variant="outline" aria-label={locale === "fr" ? `Voir la fiche complète de ${dish.name}` : `View the full record for ${dish.name}`} className={`${compact ? "mt-2 h-8 px-2 text-[10px]" : "mt-4"} w-full border-burgundy/20 bg-white text-burgundy shadow-[0_10px_24px_-22px_rgba(90,38,50,0.68)] hover:bg-burgundy hover:text-white`}>
          <ReiconGlyph icon={BookOpen} weight="Filled" className={compact ? "mr-1 h-3.5 w-3.5" : "mr-2 h-4 w-4"} /> {compact ? (locale === "fr" ? "Voir la fiche" : "View record") : (locale === "fr" ? "Voir la fiche complète" : "View full dish")}
        </Button>
      </div>
    </article>
  );
}

export function DishDetailsDialog({ dish, onClose }: { dish: DishLibraryItem | null; onClose: () => void }) {
  const locale = useStore((state) => state.locale);
  const navigate = useStore((state) => state.navigate);
  const preparationGuides = buildRecipeStepGuides(dish?.steps || [], locale);
  const preparationIngredientGroups = (dish?.steps || []).map((step) => ingredientsForPreparationStep(step, dish?.ingredients || [], locale));
  const activeMinutes = preparationGuides.reduce((total, guide) => total + guide.durationMinutes, 0);
  const restMinutes = preparationGuides.reduce((total, guide) => total + guide.restMinutes, 0);
  const equipment = Array.from(new Set(preparationGuides.map((guide) => guide.equipment).filter((item): item is string => Boolean(item))));

  return (
    <Dialog open={Boolean(dish)} onOpenChange={(open) => { if (!open) onClose(); }}>
      {dish ? (
        <DialogContent closeLabel={locale === "fr" ? "Fermer" : "Close"} className="min-w-0 max-h-[calc(100svh-1rem)] overflow-x-hidden overflow-y-auto p-0 sm:max-w-4xl">
          <div className="relative h-60 min-w-0 max-w-full overflow-hidden rounded-t-lg bg-muted sm:h-auto sm:aspect-[16/6] sm:min-h-52">
            <ProductImage src={getRecipePhoto({ name: dish.name, title: dish.name, country: dish.country, category: dish.categoryLabel })} alt={dish.name} emoji="🍽️" color="#8A3042" size="lg" className="h-full w-full" rounded="rounded-none" />
            <div className="absolute inset-0 bg-gradient-to-t from-burgundy/95 via-burgundy/15 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 min-w-0 p-4 text-white sm:p-7">
              <p className="truncate text-[10px] font-bold uppercase text-gold sm:text-xs">{dish.country} · {dish.region}</p>
              <DialogHeader className="mt-1 min-w-0 text-left">
                <DialogTitle className="max-w-full whitespace-normal break-words text-xl font-extrabold leading-tight text-white sm:text-3xl">{dish.name}</DialogTitle>
                <DialogDescription className="line-clamp-3 max-w-full whitespace-normal break-words text-[11px] leading-5 text-white/85 sm:max-w-2xl sm:text-sm">{dish.description}</DialogDescription>
              </DialogHeader>
            </div>
          </div>

          <div className="space-y-6 p-5 sm:p-7">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <DetailMetric icon={Clock} label={locale === "fr" ? "Temps" : "Time"} value={`${dish.timeMinutes} min`} />
              <DetailMetric icon={UserHands} label={locale === "fr" ? "Portions" : "Servings"} value={String(dish.servings)} />
              <DetailMetric icon={ChefHat} label={locale === "fr" ? "Niveau" : "Level"} value={dish.difficulty} />
              <DetailMetric icon={MapPoint} label={locale === "fr" ? "Origine" : "Origin"} value={dish.country} />
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
                <p className="mt-1 text-xs text-muted-foreground">{locale === "fr" ? `${preparationGuides.length} actions guidées, avec repères de cuisson` : `${preparationGuides.length} guided actions with cooking cues`}</p>
                <div className="mt-3 grid grid-cols-3 divide-x divide-border border-y border-border bg-[#FFFCFA] py-2.5 text-center" data-testid="dish-preparation-summary">
                  <PreparationSummary icon={Timer} label={locale === "fr" ? "Actif" : "Active"} value={`${activeMinutes} min`} />
                  <PreparationSummary icon={Hourglass} label={locale === "fr" ? "Repos" : "Rest"} value={`${restMinutes} min`} />
                  <PreparationSummary icon={RollingPin} label={locale === "fr" ? "Matériel" : "Equipment"} value={String(equipment.length)} />
                </div>
                <div className="mt-3 border-l-2 border-l-gold bg-gold/[0.055] px-3 py-2.5" data-testid="dish-mise-en-place">
                  <p className="text-[10px] font-black uppercase text-charcoal">{locale === "fr" ? "Mise en place" : "Before you start"}</p>
                  <p className="mt-1 text-[10px] leading-4 text-muted-foreground">{locale === "fr" ? `Pesez les ${dish.ingredients.length} ingrédients, séparez les aliments crus et préparez le matériel avant la première cuisson.` : `Measure all ${dish.ingredients.length} ingredients, separate raw food and prepare the equipment before the first cooking step.`}</p>
                  <div tabIndex={0} className="mt-2 flex gap-1.5 overflow-x-auto pb-1 outline-none focus-visible:ring-2 focus-visible:ring-terre/30 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label={locale === "fr" ? "Matériel à préparer" : "Equipment to prepare"}>{equipment.map((item) => <span key={item} className="shrink-0 rounded-md border border-gold/25 bg-white px-2 py-1 text-[8px] font-bold text-charcoal">{item}</span>)}</div>
                </div>
                <ol className="mt-3 divide-y divide-border border-y border-border" data-testid="dish-detailed-steps">
                  {preparationGuides.map((guide, index) => (
                    <li key={index} className="flex gap-3 border-l-2 border-l-terre/35 px-1 py-3">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-burgundy text-xs font-bold text-white">{index + 1}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                          <p className="text-xs font-black text-charcoal"><span className="mr-1.5 rounded bg-burgundy/[0.07] px-1.5 py-0.5 text-[8px] uppercase text-burgundy">{guide.phaseLabel}</span><span>{guide.title}</span></p>
                          <span className="inline-flex shrink-0 flex-wrap items-center gap-2 text-[9px] font-bold text-muted-foreground"><span className="inline-flex items-center gap-1"><ReiconGlyph icon={Timer} className="h-3 w-3 text-terre" />{guide.durationLabel}</span>{guide.restLabel ? <span className="inline-flex items-center gap-1"><ReiconGlyph icon={Hourglass} className="h-3 w-3 text-gold" />{guide.restLabel}</span> : null}<span className="inline-flex items-center gap-1"><ReiconGlyph icon={Flame} className="h-3 w-3 text-gold" />{guide.heatLabel}</span>{guide.temperatureLabel ? <span className="inline-flex items-center gap-1"><ReiconGlyph icon={Thermometer} className="h-3 w-3 text-terre" />{guide.temperatureLabel}</span> : null}</span>
                        </div>
                        <p className="mt-1 text-xs leading-5 text-charcoal/80 sm:text-sm sm:leading-6">{guide.instruction}</p>
                        <div className="mt-2 border-l border-gold/40 pl-2.5" data-testid="dish-precise-actions">
                          <p className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase text-charcoal/75"><ReiconGlyph icon={ListCheck} weight="Filled" className="h-3.5 w-3.5 text-burgundy" />{locale === "fr" ? "Déroulé précis" : "Precise sequence"}</p>
                          <ol className="mt-1.5 space-y-1">
                            {guide.actions.map((action, actionIndex) => <li key={`${actionIndex}-${action}`} className="flex items-start gap-2 text-[10px] leading-4 text-muted-foreground"><span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-burgundy/[0.09] text-[8px] font-black text-burgundy" aria-hidden="true">{actionIndex + 1}</span><span>{action}</span></li>)}
                          </ol>
                        </div>
                        {preparationIngredientGroups[index]?.length ? <p className="mt-1.5 text-[10px] font-semibold leading-4 text-terre"><strong className="text-charcoal/75">{locale === "fr" ? "À mesurer :" : "Measure:"}</strong> {preparationIngredientGroups[index].map((ingredient) => `${ingredient.quantity} ${ingredient.name}`).join(" · ")}</p> : null}
                        <p className="mt-1.5 flex items-start gap-1.5 text-[10px] leading-4 text-muted-foreground"><ReiconGlyph icon={Eye} className="mt-0.5 h-3 w-3 text-burgundy" /><span><strong className="text-charcoal/75">{locale === "fr" ? "Résultat :" : "Result:"}</strong> {guide.cue}</span></p>
                        <p className="mt-1 flex items-start gap-1.5 text-[10px] leading-4 text-muted-foreground"><ReiconGlyph icon={RollingPin} className="mt-0.5 h-3 w-3 text-terre" /><span><strong className="text-charcoal/75">{locale === "fr" ? "Matériel :" : "Equipment:"}</strong> {guide.equipment}</span></p>
                        <p className="mt-1 flex items-start gap-1.5 text-[10px] leading-4 text-muted-foreground"><ReiconGlyph icon={HelpCircle} className="mt-0.5 h-3 w-3 text-burgundy" /><span><strong className="text-charcoal/75">{locale === "fr" ? "Pourquoi :" : "Why:"}</strong> {guide.why}</span></p>
                        <p className="mt-1 flex items-start gap-1.5 text-[10px] leading-4 text-muted-foreground"><ReiconGlyph icon={Lightbulb} weight="Filled" className="mt-0.5 h-3 w-3 text-gold" /><span><strong className="text-charcoal/75">{locale === "fr" ? "Conseil :" : "Tip:"}</strong> {guide.tip}</span></p>
                        {guide.warning ? <p className="mt-1 flex items-start gap-1.5 text-[10px] leading-4 text-terre"><ReiconGlyph icon={AlertTriangle} weight="Filled" className="mt-0.5 h-3 w-3" /><span><strong>{locale === "fr" ? "Vigilance :" : "Take care:"}</strong> {guide.warning}</span></p> : null}
                        <p className="mt-1 flex items-start gap-1.5 text-[10px] leading-4 text-terre"><ReiconGlyph icon={Lifebuoy} className="mt-0.5 h-3 w-3" /><span><strong>{locale === "fr" ? "Rattrapage :" : "Recovery:"}</strong> {guide.recovery}</span></p>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            </div>

            <div className="rounded-lg bg-burgundy/5 p-4">
              <p className="text-xs font-extrabold uppercase tracking-wider text-burgundy">{locale === "fr" ? "Conseil de service" : "Serving note"}</p>
              <p className="mt-1 text-sm leading-6 text-charcoal">{dish.service}</p>
            </div>

            {dish.allergens.length > 0 ? (
              <div className="flex items-start gap-2 rounded-md border border-gold/40 bg-gold/[0.09] p-3 text-xs leading-5 text-charcoal">
                <ReiconGlyph icon={ShieldAlert} weight="Filled" className="mt-0.5 h-4 w-4" />
                <span><strong>{locale === "fr" ? "Allergènes à contrôler :" : "Allergens to check:"}</strong> {dish.allergens.join(", ")}. {locale === "fr" ? "Vérifiez toujours les étiquettes des produits utilisés." : "Always check the labels of the products used."}</span>
              </div>
            ) : null}

            <Button onClick={() => navigate("catalog", { query: dish.ingredients[0]?.name || dish.name })} className="w-full bg-terre text-white hover:bg-terre-dark sm:w-auto">
              <ReiconGlyph icon={Search} className="mr-2 h-4 w-4" /> {locale === "fr" ? "Trouver les ingrédients" : "Find ingredients"}
            </Button>
          </div>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}

function DetailMetric({ icon, label, value }: { icon: IconFunction; label: string; value: string }) {
  return (
    <div className="rounded-md border border-burgundy/10 bg-white p-3 shadow-[0_12px_28px_-26px_rgba(90,38,50,0.55)]">
      <ReiconGlyph icon={icon} weight="Filled" className="h-4 w-4 text-terre" />
      <p className="mt-2 text-[10px] font-semibold uppercase text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate text-xs font-bold capitalize text-charcoal">{value}</p>
    </div>
  );
}

function PreparationSummary({ icon, label, value }: { icon: IconFunction; label: string; value: string }) {
  return <div className="min-w-0 px-1"><ReiconGlyph icon={icon} weight="Filled" className="mx-auto h-3.5 w-3.5 text-terre" /><p className="mt-1 truncate text-[10px] font-black text-charcoal">{value}</p><p className="truncate text-[8px] font-semibold uppercase text-muted-foreground">{label}</p></div>;
}
