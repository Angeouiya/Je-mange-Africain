"use client";

import { useDeferredValue, useState } from "react";
import Image from "next/image";
import { BookOpen, ChefHat, MapPin, Search, Sparkles, UtensilsCrossed } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStore } from "@/lib/store";
import { dict } from "@/lib/i18n";
import { useFetch } from "@/lib/use-fetch";
import { RecipeCard } from "@/components/shared/RecipeCard";
import { DishDetailsDialog, DishLibraryCard, type DishLibraryItem } from "@/components/shared/DishLibraryCard";

export function RecipesView() {
  const locale = useStore((s) => s.locale);
  const params = useStore((s) => s.params);
  const t = dict[locale];
  const [category, setCategory] = useState<string | null>(null);
  const [search, setSearch] = useState(params.query || "");
  const [mode, setMode] = useState<"recipes" | "library">(params.recipeMode || "recipes");
  const [country, setCountry] = useState("");
  const [selectedDish, setSelectedDish] = useState<DishLibraryItem | null>(null);
  const deferredSearch = useDeferredValue(search.trim());

  const qs = new URLSearchParams({ locale });
  if (category) qs.set("category", category);
  if (deferredSearch) qs.set("q", deferredSearch);
  const { data, loading } = useFetch(`/api/recipes?${qs.toString()}`, [locale, category, deferredSearch]);
  const dishQs = new URLSearchParams({ locale });
  if (category) dishQs.set("category", category);
  if (country) dishQs.set("country", country);
  if (deferredSearch) dishQs.set("q", deferredSearch);
  const { data: dishData, loading: dishesLoading } = useFetch(`/api/dishes?${dishQs.toString()}`, [locale, category, country, deferredSearch]);

  const suggestions = locale === "fr"
    ? ["Attiéké poisson", "Sauce gombo", "Mafé", "Kplô", "Plantain", "Dîner rapide"]
    : ["Attieke fish", "Okra sauce", "Mafe", "Kplo", "Plantain", "Quick dinner"];

  return (
    <div className="mx-auto max-w-7xl px-4 py-5 md:px-7 md:py-6 lg:px-8">
      {/* hero */}
      <section className="relative mb-4 min-h-80 overflow-hidden rounded-lg bg-charcoal p-4 text-white md:min-h-96 md:p-10" data-testid="recipes-hero">
        <Image src="/recipe-library-hero.webp" alt="" fill sizes="100vw" className="object-cover" priority />
        <div className="absolute inset-0 bg-gradient-to-r from-charcoal/88 via-charcoal/62 to-charcoal/12" />
        <div className="relative max-w-3xl">
          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase text-gold">
            <Sparkles className="h-3 w-3" /> {t.home.heroCtaRecipes}
          </span>
          <h1 className="mt-2 max-w-xl font-display text-2xl font-semibold leading-tight md:mt-3 md:text-5xl">{t.recipes.title}</h1>
          <p className="mt-2 line-clamp-2 max-w-2xl text-xs leading-5 text-white/78 md:text-base md:leading-6">{t.recipes.subtitle}</p>
          <p className="mt-1.5 inline-flex items-center gap-1.5 text-[10px] font-semibold leading-4 text-gold md:mt-2 md:text-xs"><BookOpen className="h-3.5 w-3.5 shrink-0" /> {locale === "fr" ? "20 plats africains documentés, dont 10 spécialités ivoiriennes" : "20 documented African dishes, including 10 Ivorian specialties"}</p>
          <div className="mt-4 max-w-2xl rounded-md border border-white/16 bg-white/10 p-1.5 backdrop-blur md:mt-6 md:p-2">
            <div className="flex items-center gap-2 rounded-md bg-white px-3 py-2 text-charcoal">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={locale === "fr" ? "Rechercher un plat, un ingrédient, une origine..." : "Search a dish, ingredient, origin..."}
                aria-label={locale === "fr" ? "Rechercher une recette ou un plat" : "Search for a recipe or dish"}
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            <div className="mt-1.5 flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mt-2 md:flex-wrap">
              {suggestions.map((item) => (
                <button
                  key={item}
                  onClick={() => setSearch(item)}
                  className="shrink-0 rounded-md border border-white/20 bg-white/12 px-2.5 py-1 text-[10px] font-semibold text-white transition hover:bg-white/22 md:text-[11px]"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Tabs
        value={mode}
        onValueChange={(value) => { setMode(value as "recipes" | "library"); setCategory(null); setCountry(""); }}
        className="gap-3"
      >
        <TabsList className="grid h-11 w-full grid-cols-2 bg-muted p-1 sm:w-[32rem]">
          <TabsTrigger value="recipes" className="h-full min-w-0 text-xs"><UtensilsCrossed className="h-4 w-4 shrink-0" /> {locale === "fr" ? "Recettes" : "Recipes"}</TabsTrigger>
          <TabsTrigger value="library" className="h-full min-w-0 text-xs"><BookOpen className="h-4 w-4 shrink-0" /> {locale === "fr" ? "Bibliothèque" : "Dish library"}</TabsTrigger>
        </TabsList>

        <div className="flex flex-col gap-2 border-b border-border pb-2">
          <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:px-0">
            <button type="button" onClick={() => setCategory(null)} aria-pressed={!category} className={`shrink-0 rounded-md px-3 py-1.5 text-[11px] font-semibold transition ${!category ? "bg-terre text-cream" : "border border-border bg-card text-charcoal hover:bg-muted"}`}>
              {t.recipes.all}
            </button>
            {(mode === "recipes" ? data?.categories : dishData?.categories)?.map((item: any) => (
              <button type="button" key={item.slug} onClick={() => setCategory(category === item.slug ? null : item.slug)} aria-pressed={category === item.slug} className={`shrink-0 rounded-md px-3 py-1.5 text-[11px] font-semibold transition ${category === item.slug ? "bg-terre text-cream" : "border border-border bg-card text-charcoal hover:bg-muted"}`}>
                {item.name}
              </button>
            ))}
          </div>
          {mode === "library" ? (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
              <button type="button" onClick={() => setCountry("")} aria-pressed={!country} className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold ${!country ? "bg-burgundy text-white" : "bg-burgundy/8 text-burgundy"}`}>{locale === "fr" ? "Toute l'Afrique" : "All Africa"}</button>
              {dishData?.countries?.map((item: string) => (
                <button type="button" key={item} onClick={() => setCountry(country === item ? "" : item)} aria-pressed={country === item} className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold ${country === item ? "bg-burgundy text-white" : "bg-burgundy/8 text-burgundy"}`}>{item}</button>
              ))}
            </div>
          ) : null}
        </div>

        <TabsContent value="recipes">
          {loading ? (
            <ResultSkeleton />
          ) : (
            <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 md:gap-4" data-testid="recipes-grid">
              {data?.recipes?.length ? data.recipes.map((recipe: any, index: number) => <RecipeCard key={recipe.id} recipe={recipe} index={index} compact />) : (
                <EmptyResult locale={locale} onReset={() => { setSearch(""); setCategory(null); }} library={false} />
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="library">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{dishData?.dishes?.length || 0} {locale === "fr" ? "plats détaillés" : "detailed dishes"}</p>
            <span className="text-[11px] font-semibold text-burgundy">{locale === "fr" ? "Fiches éditoriales vérifiables" : "Curated editorial records"}</span>
          </div>
          {dishesLoading ? (
            <ResultSkeleton />
          ) : (
            <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 md:gap-4" data-testid="dish-library-grid">
              {dishData?.dishes?.length ? dishData.dishes.map((dish: DishLibraryItem, index: number) => <DishLibraryCard key={dish.slug} dish={dish} onSelect={setSelectedDish} compact index={index} />) : (
                <EmptyResult locale={locale} onReset={() => { setSearch(""); setCategory(null); setCountry(""); }} library />
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
      <DishDetailsDialog dish={selectedDish} onClose={() => setSelectedDish(null)} />
    </div>
  );
}

function ResultSkeleton() {
  return <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 md:gap-4">{Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="aspect-[3/5] rounded-md" />)}</div>;
}

function EmptyResult({ locale, onReset, library }: { locale: "fr" | "en"; onReset: () => void; library: boolean }) {
  return (
    <div className="col-span-full rounded-lg border border-dashed border-border bg-card p-8 text-center">
      {library ? <BookOpen className="mx-auto h-10 w-10 text-muted-foreground" /> : <ChefHat className="mx-auto h-10 w-10 text-muted-foreground" />}
      <p className="mt-3 text-sm font-semibold text-charcoal">{locale === "fr" ? "Aucun plat ne correspond à cette recherche." : "No dish matches this search."}</p>
      <button onClick={onReset} className="mt-2 text-sm font-semibold text-terre hover:underline">{locale === "fr" ? "Réinitialiser le moteur" : "Reset engine"}</button>
    </div>
  );
}
