"use client";

import { useState } from "react";
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

  const qs = new URLSearchParams({ locale });
  if (category) qs.set("category", category);
  if (search.trim()) qs.set("q", search.trim());
  const { data, loading } = useFetch(`/api/recipes?${qs.toString()}`, [locale, category, search]);
  const dishQs = new URLSearchParams({ locale });
  if (category) dishQs.set("category", category);
  if (country) dishQs.set("country", country);
  if (search.trim()) dishQs.set("q", search.trim());
  const { data: dishData, loading: dishesLoading } = useFetch(`/api/dishes?${dishQs.toString()}`, [locale, category, country, search]);

  const suggestions = locale === "fr"
    ? ["Attiéké poisson", "Sauce gombo", "Mafé", "Kplô", "Plantain", "Dîner rapide"]
    : ["Attieke fish", "Okra sauce", "Mafe", "Kplo", "Plantain", "Quick dinner"];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
      {/* hero */}
      <section className="relative mb-6 overflow-hidden rounded-lg bg-charcoal p-6 text-cream md:p-10">
        <Image src="/recipe-library-hero.webp" alt="" fill sizes="100vw" className="object-cover" priority />
        <div className="absolute inset-0 bg-gradient-to-r from-charcoal/88 via-charcoal/62 to-charcoal/12" />
        <div className="relative max-w-3xl">
          <span className="inline-flex items-center gap-1 rounded-full bg-gold/90 px-3 py-1 text-xs font-semibold text-charcoal">
            <Sparkles className="h-3 w-3" /> {t.home.heroCtaRecipes}
          </span>
          <h1 className="mt-3 text-2xl font-extrabold md:text-4xl">{t.recipes.title}</h1>
          <p className="mt-1 max-w-2xl text-cream/85">{t.recipes.subtitle}</p>
          <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-gold"><BookOpen className="h-3.5 w-3.5" /> {locale === "fr" ? "20 plats africains documentés, dont 10 spécialités ivoiriennes" : "20 documented African dishes, including 10 Ivorian specialties"}</p>
          <div className="mt-5 max-w-2xl rounded-lg border border-cream/15 bg-cream/12 p-2 backdrop-blur">
            <div className="flex items-center gap-2 rounded-md bg-white px-3 py-2 text-charcoal">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={locale === "fr" ? "Rechercher un plat, un ingrédient, une origine..." : "Search a dish, ingredient, origin..."}
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {suggestions.map((item) => (
                <button
                  key={item}
                  onClick={() => setSearch(item)}
                  className="rounded-full border border-cream/20 bg-cream/15 px-2.5 py-1 text-[11px] font-semibold text-cream transition hover:bg-cream/25"
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
        className="gap-5"
      >
        <TabsList className="grid h-11 w-full grid-cols-2 bg-muted p-1 sm:w-[32rem]">
          <TabsTrigger value="recipes" className="h-full min-w-0 text-xs"><UtensilsCrossed className="h-4 w-4 shrink-0" /> {locale === "fr" ? "Recettes" : "Recipes"}</TabsTrigger>
          <TabsTrigger value="library" className="h-full min-w-0 text-xs"><BookOpen className="h-4 w-4 shrink-0" /> {locale === "fr" ? "Bibliothèque" : "Dish library"}</TabsTrigger>
        </TabsList>

        <div className="flex flex-col gap-3 border-b border-border pb-4">
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setCategory(null)} className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${!category ? "bg-terre text-cream" : "border border-border bg-card text-charcoal hover:bg-muted"}`}>
              {t.recipes.all}
            </button>
            {(mode === "recipes" ? data?.categories : dishData?.categories)?.map((item: any) => (
              <button key={item.slug} onClick={() => setCategory(category === item.slug ? null : item.slug)} className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${category === item.slug ? "bg-terre text-cream" : "border border-border bg-card text-charcoal hover:bg-muted"}`}>
                {item.name}
              </button>
            ))}
          </div>
          {mode === "library" ? (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
              <button onClick={() => setCountry("")} className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold ${!country ? "bg-forest text-white" : "bg-forest/8 text-forest"}`}>{locale === "fr" ? "Toute l'Afrique" : "All Africa"}</button>
              {dishData?.countries?.map((item: string) => (
                <button key={item} onClick={() => setCountry(country === item ? "" : item)} className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold ${country === item ? "bg-forest text-white" : "bg-forest/8 text-forest"}`}>{item}</button>
              ))}
            </div>
          ) : null}
        </div>

        <TabsContent value="recipes">
          {loading ? (
            <ResultSkeleton />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data?.recipes?.length ? data.recipes.map((recipe: any, index: number) => <RecipeCard key={recipe.id} recipe={recipe} index={index} />) : (
                <EmptyResult locale={locale} onReset={() => { setSearch(""); setCategory(null); }} library={false} />
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="library">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{dishData?.dishes?.length || 0} {locale === "fr" ? "plats détaillés" : "detailed dishes"}</p>
            <span className="text-[11px] font-semibold text-forest">{locale === "fr" ? "Fiches éditoriales vérifiables" : "Curated editorial records"}</span>
          </div>
          {dishesLoading ? (
            <ResultSkeleton />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {dishData?.dishes?.length ? dishData.dishes.map((dish: DishLibraryItem) => <DishLibraryCard key={dish.slug} dish={dish} onSelect={setSelectedDish} />) : (
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
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-80 rounded-lg" />)}</div>;
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
