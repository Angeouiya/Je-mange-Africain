"use client";

import { useDeferredValue, useState } from "react";
import Image from "next/image";
import { BookOpen, ChefHat, Globe2, MapPin, Search, Sparkles, UtensilsCrossed, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStore } from "@/lib/store";
import { dict } from "@/lib/i18n";
import { useFetch } from "@/lib/use-fetch";
import { RecipeCard, type RecipeListItem } from "@/components/shared/RecipeCard";
import { DishDetailsDialog, DishLibraryCard, type DishLibraryItem } from "@/components/shared/DishLibraryCard";

type CategoryOption = { slug: string; name: string };
type RecipeResponse = { recipes: RecipeListItem[]; categories: CategoryOption[] };
type DishResponse = { dishes: DishLibraryItem[]; countries: string[]; categories: CategoryOption[] };

export function RecipesView() {
  const locale = useStore((state) => state.locale);
  const params = useStore((state) => state.params);
  const t = dict[locale];
  const [category, setCategory] = useState<string | null>(null);
  const [search, setSearch] = useState(params.query || "");
  const [mode, setMode] = useState<"recipes" | "library">(params.recipeMode || "recipes");
  const [country, setCountry] = useState("");
  const [selectedDish, setSelectedDish] = useState<DishLibraryItem | null>(null);
  const deferredSearch = useDeferredValue(search.trim());
  const isFr = locale === "fr";

  const recipeQuery = new URLSearchParams({ locale });
  if (category) recipeQuery.set("category", category);
  if (deferredSearch) recipeQuery.set("q", deferredSearch);
  const { data, loading } = useFetch<RecipeResponse>(`/api/recipes?${recipeQuery.toString()}`, [locale, category, deferredSearch]);

  const dishQuery = new URLSearchParams({ locale });
  if (category) dishQuery.set("category", category);
  if (country) dishQuery.set("country", country);
  if (deferredSearch) dishQuery.set("q", deferredSearch);
  const { data: dishData, loading: dishesLoading } = useFetch<DishResponse>(`/api/dishes?${dishQuery.toString()}`, [locale, category, country, deferredSearch]);

  const suggestions = isFr
    ? ["Attiéké poisson", "Sauce gombo", "Mafé", "Plantain", "Dîner rapide"]
    : ["Attieke fish", "Okra sauce", "Mafe", "Plantain", "Quick dinner"];
  const categories = mode === "recipes" ? data?.categories || [] : dishData?.categories || [];
  const resultCount = mode === "recipes" ? data?.recipes.length || 0 : dishData?.dishes.length || 0;
  const hasFilters = Boolean(category || country || deferredSearch);

  const changeMode = (value: string) => {
    const nextMode = value as "recipes" | "library";
    setMode(nextMode);
    setCategory(null);
    setCountry("");
    const query = new URLSearchParams(window.location.search);
    query.set("view", "recipes");
    query.set("recipeMode", nextMode);
    window.history.replaceState(window.history.state, "", `/?${query.toString()}`);
  };

  const resetFilters = () => {
    setSearch("");
    setCategory(null);
    setCountry("");
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-4 md:px-7 md:py-6 lg:px-8">
      <section className="relative mb-4 min-h-[14.5rem] overflow-hidden rounded-lg border border-burgundy/10 bg-[#FFF8F4] md:min-h-[16.5rem]" data-testid="recipes-hero">
        <Image src="/recipe-library-hero.webp" alt="" fill sizes="(max-width: 767px) 100vw, calc(100vw - 16rem)" className="object-cover object-center" priority />
        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/95 to-white/55 md:via-white/90 md:to-white/20" />
        <div className="relative flex min-h-[14.5rem] max-w-3xl flex-col justify-center p-4 md:min-h-[16.5rem] md:p-7">
          <p className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase text-terre"><Sparkles className="h-3.5 w-3.5" />{isFr ? "Cuisine africaine, panier intelligent" : "African cooking, smart basket"}</p>
          <h1 className="mt-1.5 max-w-xl font-display text-2xl font-semibold leading-tight text-charcoal md:text-4xl">{t.recipes.title}</h1>
          <p className="mt-1.5 line-clamp-2 max-w-xl text-[11px] leading-4 text-charcoal/75 md:text-sm md:leading-5">{t.recipes.subtitle}</p>
          <div className="mt-3 max-w-2xl rounded-md border border-burgundy/15 bg-white p-1 shadow-[0_12px_34px_-24px_rgba(138,48,66,0.45)]">
            <label className="flex h-9 items-center gap-2 px-2.5">
              <Search className="h-4 w-4 shrink-0 text-terre" />
              <span className="sr-only">{isFr ? "Rechercher une recette ou un plat" : "Search for a recipe or dish"}</span>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={isFr ? "Plat, ingrédient ou origine" : "Dish, ingredient or origin"} aria-label={isFr ? "Rechercher une recette ou un plat" : "Search for a recipe or dish"} className="min-w-0 flex-1 bg-transparent text-xs text-charcoal outline-none placeholder:text-muted-foreground md:text-sm" />
              {search ? <button type="button" onClick={() => setSearch("")} className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-burgundy/5 hover:text-burgundy" aria-label={isFr ? "Effacer la recherche" : "Clear search"}><X className="h-3.5 w-3.5" /></button> : null}
            </label>
          </div>
          <div className="mt-2 flex max-w-2xl gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {suggestions.map((item) => <button key={item} type="button" onClick={() => setSearch(item)} aria-pressed={search === item} className={`shrink-0 rounded-md border px-2 py-1 text-[9px] font-bold transition ${search === item ? "border-burgundy bg-burgundy text-white" : "border-burgundy/12 bg-white/90 text-charcoal hover:border-terre/30 hover:text-terre"}`}>{item}</button>)}
          </div>
        </div>
      </section>

      <Tabs value={mode} onValueChange={changeMode} className="gap-3">
        <TabsList className="grid h-11 w-full grid-cols-2 border border-burgundy/10 bg-[#F7F2F0] p-1 sm:w-[32rem]">
          <TabsTrigger value="recipes" className="h-full min-w-0 text-xs"><UtensilsCrossed className="h-4 w-4 shrink-0" /> {isFr ? "Recettes à cuisiner" : "Recipes to cook"}</TabsTrigger>
          <TabsTrigger value="library" className="h-full min-w-0 text-xs"><BookOpen className="h-4 w-4 shrink-0" /> {isFr ? "Atlas des plats" : "Dish atlas"}</TabsTrigger>
        </TabsList>

        <section className="border-y border-charcoal/10 py-3" aria-label={isFr ? "Filtres de la bibliothèque" : "Library filters"}>
          <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:px-0">
            <FilterButton active={!category} onClick={() => setCategory(null)}>{mode === "recipes" ? t.recipes.all : (isFr ? "Tous les plats" : "All dishes")}</FilterButton>
            {categories.map((item) => <FilterButton key={item.slug} active={category === item.slug} onClick={() => setCategory(category === item.slug ? null : item.slug)}>{item.name}</FilterButton>)}
          </div>
          {mode === "library" ? <div className="mt-2 flex items-center gap-1.5 overflow-x-auto border-t border-charcoal/8 pt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <MapPin className="mr-0.5 h-4 w-4 shrink-0 text-terre" />
            <FilterButton active={!country} onClick={() => setCountry("")}><Globe2 className="mr-1 inline h-3 w-3" />{isFr ? "Toute l'Afrique" : "All Africa"}</FilterButton>
            {(dishData?.countries || []).map((item) => <FilterButton key={item} active={country === item} onClick={() => setCountry(country === item ? "" : item)}>{item}</FilterButton>)}
          </div> : null}
          <div className="mt-2 flex items-end justify-between gap-3 border-t border-charcoal/8 pt-2">
            <div><p className="text-[9px] font-black uppercase text-terre">{mode === "recipes" ? (isFr ? "Prêts à personnaliser" : "Ready to personalise") : (isFr ? "Patrimoine culinaire" : "Culinary heritage")}</p><h2 className="mt-0.5 text-sm font-black text-charcoal">{mode === "recipes" ? (isFr ? "Choisissez votre prochain repas" : "Choose your next meal") : (isFr ? "Explorez les plats par origine" : "Explore dishes by origin")}</h2></div>
            <div className="shrink-0 text-right" aria-live="polite"><p className="text-sm font-black tabular-nums text-burgundy">{resultCount}</p><p className="text-[8px] text-muted-foreground">{mode === "recipes" ? (isFr ? "recettes" : "recipes") : (isFr ? "fiches" : "records")}</p></div>
          </div>
          {hasFilters ? <button type="button" onClick={resetFilters} className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-md border border-burgundy/15 bg-white px-2.5 text-[9px] font-bold text-burgundy hover:bg-burgundy/[0.04]"><X className="h-3 w-3" />{isFr ? "Effacer les filtres" : "Clear filters"}</button> : null}
        </section>

        <TabsContent value="recipes">
          {loading ? <ResultSkeleton /> : <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 md:gap-4" data-testid="recipes-grid">{data?.recipes.length ? data.recipes.map((recipe, index) => <RecipeCard key={recipe.id} recipe={recipe} index={index} compact />) : <EmptyResult locale={locale} onReset={resetFilters} library={false} />}</div>}
        </TabsContent>

        <TabsContent value="library">
          {dishesLoading ? <ResultSkeleton /> : <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 md:gap-4" data-testid="dish-library-grid">{dishData?.dishes.length ? dishData.dishes.map((dish, index) => <DishLibraryCard key={dish.slug} dish={dish} onSelect={setSelectedDish} compact index={index} />) : <EmptyResult locale={locale} onReset={resetFilters} library />}</div>}
        </TabsContent>
      </Tabs>
      <DishDetailsDialog dish={selectedDish} onClose={() => setSelectedDish(null)} />
    </div>
  );
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} aria-pressed={active} className={`shrink-0 rounded-md border px-2.5 py-1.5 text-[10px] font-bold transition ${active ? "border-terre bg-terre text-white" : "border-charcoal/10 bg-white text-charcoal hover:border-burgundy/25 hover:text-burgundy"}`}>{children}</button>;
}

function ResultSkeleton() {
  return <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 md:gap-4">{Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="aspect-[3/5] rounded-md" />)}</div>;
}

function EmptyResult({ locale, onReset, library }: { locale: "fr" | "en"; onReset: () => void; library: boolean }) {
  return <div className="col-span-full border-y border-dashed border-charcoal/15 py-12 text-center">{library ? <BookOpen className="mx-auto h-9 w-9 text-terre" /> : <ChefHat className="mx-auto h-9 w-9 text-terre" />}<p className="mt-3 text-sm font-black text-charcoal">{locale === "fr" ? "Aucun plat ne correspond à cette recherche." : "No dish matches this search."}</p><button type="button" onClick={onReset} className="mt-2 text-xs font-bold text-burgundy hover:underline">{locale === "fr" ? "Réinitialiser la bibliothèque" : "Reset the library"}</button></div>;
}
