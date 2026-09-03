"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { BookOpen, ChefHat, Clock3, LoaderCircle, Package, Search, X } from "lucide-react";
import { ProductImage } from "./ProductImage";
import { useStore } from "@/lib/store";
import { dict } from "@/lib/i18n";
import { useFetch } from "@/lib/use-fetch";
import { formatPrice } from "@/lib/format";
import { getDiscountPercent, getProductPhoto, getRecipePhoto } from "@/lib/market-media";
import { cn } from "@/lib/utils";

type ProductResult = {
  kind: "product";
  id: string;
  name: string;
  traditionalName: string;
  emoji: string;
  imageUrl: string | null;
  color: string;
  price: number;
  promoPrice: number | null;
  country: string;
  thermalClass: string;
  packaging: string;
  availableStock: number;
  category: { id: string; slug: string; name: string; color: string | null } | null;
  matchedAlias: string | null;
};

type RecipeResult = {
  kind: "recipe";
  id: string;
  slug: string;
  name: string;
  emoji: string;
  imageUrl: string | null;
  color: string;
  country: string;
  category: string;
  difficulty: string;
  timeMinutes: number;
  baseServings: number;
};

type DishResult = {
  kind: "dish";
  slug: string;
  name: string;
  country: string;
  categoryLabel: string;
};

type SearchResponse = {
  results: ProductResult[];
  recipes: RecipeResult[];
  dishes: DishResult[];
};

type SearchOption = ProductResult | RecipeResult | DishResult;

const POPULAR_SEARCHES = ["Attiéké", "Gombo", "Mafé", "Kplô", "Placali"];

export function SearchBar({ autoFocus = false, compact = false }: { autoFocus?: boolean; compact?: boolean }) {
  const locale = useStore((state) => state.locale);
  const navigate = useStore((state) => state.navigate);
  const t = dict[locale];
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [debounced, setDebounced] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  useEffect(() => setActiveIndex(-1), [debounced]);

  const { data, loading } = useFetch<SearchResponse>(debounced ? `/api/search?q=${encodeURIComponent(debounced)}&locale=${locale}&limit=6` : null, [debounced, locale]);
  const options = useMemo<SearchOption[]>(() => [...(data?.results || []), ...(data?.recipes || []), ...(data?.dishes || [])], [data]);
  const showPanel = open && (!query.trim() || Boolean(debounced));

  const submit = (value = query) => {
    const normalized = value.trim();
    if (!normalized) return;
    navigate("catalog", { query: normalized });
    setOpen(false);
  };

  const selectOption = (option: SearchOption) => {
    if (option.kind === "product") navigate("product", { productId: option.id });
    else if (option.kind === "recipe") navigate("recipe-config", { recipeId: option.id });
    else navigate("recipes", { query: option.name, recipeMode: "library" });
    setOpen(false);
    setQuery("");
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
      return;
    }
    if (event.key === "ArrowDown" && options.length) {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) => (current + 1) % options.length);
      return;
    }
    if (event.key === "ArrowUp" && options.length) {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) => current <= 0 ? options.length - 1 : current - 1);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (activeIndex >= 0 && options[activeIndex]) selectOption(options[activeIndex]);
      else submit();
    }
  };

  const setPopularSearch = (value: string) => {
    setQuery(value);
    setDebounced(value);
    setOpen(true);
  };

  const clear = () => {
    setQuery("");
    setDebounced("");
    setActiveIndex(-1);
  };

  let optionIndex = -1;

  return (
    <div ref={rootRef} className="relative w-full">
      <div className={cn("flex items-center gap-2 rounded-lg border border-border bg-white shadow-sm transition focus-within:border-terre focus-within:ring-2 focus-within:ring-terre/20", compact ? "px-3 py-2" : "px-4 py-2.5")}>
        {loading && debounced ? <LoaderCircle className="h-4 w-4 shrink-0 animate-spin text-terre" aria-hidden="true" /> : <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
        <input
          autoFocus={autoFocus}
          value={query}
          onChange={(event) => { setQuery(event.target.value); setActiveIndex(-1); setOpen(true); }}
          onKeyDown={handleKeyDown}
          onFocus={() => setOpen(true)}
          placeholder={compact ? (locale === "fr" ? "Produit, recette ou ingrédient..." : "Product, recipe or ingredient...") : t.header.searchPlaceholder}
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          role="combobox"
          aria-label={locale === "fr" ? "Recherche globale" : "Global search"}
          aria-autocomplete="list"
          aria-expanded={showPanel}
          aria-controls={listboxId}
          aria-activedescendant={activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined}
        />
        {query ? <button type="button" onClick={clear} aria-label={locale === "fr" ? "Effacer la recherche" : "Clear search"} className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-charcoal"><X className="h-4 w-4" /></button> : null}
      </div>

      {showPanel ? (
        <div id={listboxId} role="listbox" aria-label={locale === "fr" ? "Suggestions de recherche" : "Search suggestions"} className="absolute z-50 mt-2 max-h-[min(32rem,calc(100dvh-10rem))] w-full min-w-[min(22rem,calc(100vw-1.5rem))] overflow-y-auto overscroll-contain rounded-lg border border-border bg-white shadow-[0_22px_70px_-28px_rgba(63,41,48,0.5)] md:min-w-0">
          {!query.trim() ? (
            <div className="p-4">
              <p className="text-[10px] font-black uppercase text-muted-foreground">{locale === "fr" ? "Recherches populaires" : "Popular searches"}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {POPULAR_SEARCHES.map((item) => <button key={item} type="button" onClick={() => setPopularSearch(item)} className="min-h-10 rounded-md border border-border bg-white px-3 text-left text-xs font-bold text-charcoal transition-colors hover:border-terre/30 hover:bg-terre/[0.035]"><Search className="mr-1.5 inline h-3.5 w-3.5 text-terre" />{item}</button>)}
              </div>
            </div>
          ) : loading || debounced !== query.trim() ? (
            <div className="space-y-1 p-3" aria-label={locale === "fr" ? "Recherche en cours" : "Searching"}>{Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-14 animate-pulse rounded-md bg-muted" />)}</div>
          ) : data && !options.length ? (
            <div className="px-5 py-8 text-center"><Search className="mx-auto h-7 w-7 text-muted-foreground" /><p className="mt-3 text-sm font-bold text-charcoal">{t.catalog.noResults}</p><button type="button" onClick={() => submit()} className="mt-2 text-xs font-bold text-terre hover:underline">{locale === "fr" ? "Voir le catalogue" : "View catalogue"}</button></div>
          ) : data ? (
            <>
              {data.results.length ? <SearchGroupLabel icon={Package} label={locale === "fr" ? "Produits" : "Products"} count={data.results.length} /> : null}
              {data.results.map((result) => {
                const index = ++optionIndex;
                const discount = getDiscountPercent(result.price, result.promoPrice);
                return <button id={`${listboxId}-option-${index}`} role="option" aria-selected={activeIndex === index} key={`product-${result.id}`} type="button" onMouseEnter={() => setActiveIndex(index)} onClick={() => selectOption(result)} className={`flex w-full min-w-0 items-center gap-3 px-3 py-2.5 text-left transition-colors ${activeIndex === index ? "bg-muted" : "hover:bg-muted/70"}`}><ProductImage src={getProductPhoto({ ...result, imageEmoji: result.emoji })} alt={result.name} emoji={result.emoji} color={result.color} size="sm" className="h-11 w-11 shrink-0" rounded="rounded-md" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-charcoal">{result.name}</span><span className="mt-0.5 block truncate text-[10px] text-muted-foreground">{result.packaging || result.category?.name || result.country}</span><span className={`mt-1 block text-[9px] font-bold ${result.availableStock > 0 ? "text-burgundy" : "text-destructive"}`}>{result.availableStock > 0 ? (locale === "fr" ? "Disponible" : "In stock") : (locale === "fr" ? "Indisponible" : "Out of stock")}</span></span><span className="shrink-0 text-right">{discount > 0 ? <span className="mb-0.5 block text-[9px] font-bold text-destructive">-{discount}%</span> : null}<span className="block text-sm font-black text-terre">{formatPrice(result.promoPrice ?? result.price, locale)}</span></span></button>;
              })}

              {data.recipes.length ? <SearchGroupLabel icon={ChefHat} label={locale === "fr" ? "Recettes" : "Recipes"} count={data.recipes.length} /> : null}
              {data.recipes.map((result) => {
                const index = ++optionIndex;
                return <button id={`${listboxId}-option-${index}`} role="option" aria-selected={activeIndex === index} key={`recipe-${result.id}`} type="button" onMouseEnter={() => setActiveIndex(index)} onClick={() => selectOption(result)} className={`flex w-full min-w-0 items-center gap-3 px-3 py-2.5 text-left transition-colors ${activeIndex === index ? "bg-muted" : "hover:bg-muted/70"}`}><ProductImage src={getRecipePhoto({ ...result, title: result.name, imageEmoji: result.emoji })} alt={result.name} emoji={result.emoji} color={result.color} size="sm" className="h-11 w-11 shrink-0" rounded="rounded-md" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-charcoal">{result.name}</span><span className="mt-0.5 block truncate text-[10px] text-muted-foreground">{result.country} · {result.category}</span></span><span className="inline-flex shrink-0 items-center gap-1 text-[10px] font-bold text-burgundy"><Clock3 className="h-3.5 w-3.5" />{result.timeMinutes} min</span></button>;
              })}

              {data.dishes.length ? <SearchGroupLabel icon={BookOpen} label={locale === "fr" ? "Bibliothèque de plats" : "Dish library"} count={data.dishes.length} /> : null}
              {data.dishes.map((result) => {
                const index = ++optionIndex;
                return <button id={`${listboxId}-option-${index}`} role="option" aria-selected={activeIndex === index} key={`dish-${result.slug}`} type="button" onMouseEnter={() => setActiveIndex(index)} onClick={() => selectOption(result)} className={`flex w-full min-w-0 items-center gap-3 px-3 py-2.5 text-left transition-colors ${activeIndex === index ? "bg-muted" : "hover:bg-muted/70"}`}><span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-burgundy/10 text-burgundy"><BookOpen className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-charcoal">{result.name}</span><span className="mt-0.5 block truncate text-[10px] text-muted-foreground">{result.country} · {result.categoryLabel}</span></span><span className="text-[10px] font-bold text-terre">{locale === "fr" ? "Explorer" : "Explore"}</span></button>;
              })}

              <button type="button" onClick={() => submit()} className="sticky bottom-0 flex min-h-11 w-full items-center justify-center gap-2 border-t border-border bg-white/95 px-4 text-xs font-black text-terre backdrop-blur-md hover:bg-muted"><Search className="h-3.5 w-3.5" />{locale === "fr" ? `Voir tous les résultats pour « ${query.trim()} »` : `View all results for “${query.trim()}”`}</button>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function SearchGroupLabel({ icon: Icon, label, count }: { icon: typeof Search; label: string; count: number }) {
  return <div className="sticky top-0 z-10 flex items-center gap-2 border-y border-border/70 bg-muted/90 px-3 py-2 text-[9px] font-black uppercase text-muted-foreground backdrop-blur-md"><Icon className="h-3.5 w-3.5 text-terre" /><span>{label}</span><span className="ml-auto rounded bg-white px-1.5 py-0.5 text-charcoal">{count}</span></div>;
}
