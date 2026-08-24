"use client";

import { useEffect, useRef, useState } from "react";
import { BookOpen, Search, X, TrendingUp, Package } from "lucide-react";
import { useStore } from "@/lib/store";
import { dict } from "@/lib/i18n";
import { useFetch } from "@/lib/use-fetch";
import { formatPrice } from "@/lib/format";
import { getDiscountPercent, getProductPhoto, getRecipePhoto } from "@/lib/market-media";
import { ProductImage } from "./ProductImage";

export function SearchBar({ autoFocus = false }: { autoFocus?: boolean }) {
  const locale = useStore((s) => s.locale);
  const navigate = useStore((s) => s.navigate);
  const t = dict[locale];
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [debounced, setDebounced] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(q.trim()), 250);
    return () => clearTimeout(id);
  }, [q]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const { data } = useFetch(debounced ? `/api/search?q=${encodeURIComponent(debounced)}&locale=${locale}&limit=6` : null, [debounced, locale]);

  const submit = () => {
    if (!q.trim()) return;
    navigate("catalog", { query: q.trim() });
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative w-full">
      <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 shadow-sm transition focus-within:border-terre focus-within:ring-2 focus-within:ring-terre/20">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          autoFocus={autoFocus}
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          onFocus={() => setOpen(true)}
          placeholder={t.header.searchPlaceholder}
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        {q && (
          <button onClick={() => { setQ(""); setDebounced(""); }} aria-label="Effacer" className="text-muted-foreground hover:text-charcoal">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {open && debounced && data && (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-lg border border-border bg-popover shadow-xl">
          {data.results?.length === 0 && data.recipes?.length === 0 && data.dishes?.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">{t.catalog.noResults}</div>
          ) : (
            <div className="max-h-96 overflow-y-auto scroll-pretty py-1">
              {data.results?.map((r: any) => (
                <button
                  key={r.id}
                  onClick={() => { navigate("product", { productId: r.id }); setOpen(false); setQ(""); }}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-muted"
                >
                  <ProductImage
                    src={getProductPhoto({ ...r, imageEmoji: r.emoji, imageColor: r.color })}
                    alt=""
                    emoji={r.emoji}
                    color={r.color}
                    size="sm"
                    className="h-10 w-10 shrink-0"
                    rounded="rounded-lg"
                  />
                  <span className="flex-1">
                    <span className="block text-sm font-medium text-charcoal">{r.name}</span>
                    {r.matchedAlias && <span className="block text-[11px] text-gold">↳ {r.matchedAlias}</span>}
                    <span className="block text-[11px] text-muted-foreground">{r.category?.name || r.category}</span>
                  </span>
                  <span className="text-right">
                    {getDiscountPercent(r.price, r.promoPrice) > 0 && (
                      <span className="mb-0.5 block rounded bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-white">-{getDiscountPercent(r.price, r.promoPrice)}%</span>
                    )}
                    <span className="block text-sm font-bold text-terre">{formatPrice(r.promoPrice ?? r.price, locale)}</span>
                  </span>
                </button>
              ))}
              {data.recipes?.map((r: any) => (
                <button
                  key={r.id}
                  onClick={() => { navigate("recipe-config", { recipeId: r.id }); setOpen(false); setQ(""); }}
                  className="flex w-full items-center gap-3 border-t border-border px-3 py-2 text-left transition hover:bg-muted"
                >
                  <ProductImage
                    src={getRecipePhoto({ ...r, title: r.name, imageEmoji: r.emoji, imageColor: r.color })}
                    alt=""
                    emoji={r.emoji}
                    color={r.color}
                    size="sm"
                    className="h-10 w-10 shrink-0"
                    rounded="rounded-lg"
                  />
                  <span className="flex-1">
                    <span className="block text-sm font-medium text-charcoal">{r.name}</span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-forest"><TrendingUp className="h-3 w-3" /> Recette</span>
                  </span>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
              {data.dishes?.map((dish: any) => (
                <button
                  key={dish.slug}
                  onClick={() => { navigate("recipes", { query: dish.name, recipeMode: "library" }); setOpen(false); setQ(""); }}
                  className="flex w-full items-center gap-3 border-t border-border px-3 py-2 text-left transition hover:bg-muted"
                >
                  <ProductImage
                    src={getRecipePhoto({ name: dish.name, title: dish.name, country: dish.country, category: dish.categoryLabel })}
                    alt=""
                    emoji="🍽️"
                    color="#3F681C"
                    size="sm"
                    className="h-10 w-10 shrink-0"
                    rounded="rounded-lg"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-charcoal">{dish.name}</span>
                    <span className="block text-[11px] text-muted-foreground">{dish.country} · {dish.categoryLabel}</span>
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-terre"><BookOpen className="h-3.5 w-3.5" /> {locale === "fr" ? "Plat" : "Dish"}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
