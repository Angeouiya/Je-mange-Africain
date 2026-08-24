"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { PackageSearch, Search as SearchIcon, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useStore } from "@/lib/store";
import { dict } from "@/lib/i18n";
import { useFetch } from "@/lib/use-fetch";
import { ProductCard } from "@/components/shared/ProductCard";
import { CategoryIcon } from "@/components/shared/CategoryIcon";

const THERMALS = ["AMBIANT", "REFRIGERATED", "FROZEN"];

export function CatalogView() {
  const locale = useStore((s) => s.locale);
  const params = useStore((s) => s.params);
  const t = dict[locale];

  const [search, setSearch] = useState(params.query || "");
  const [cat, setCat] = useState<string | null>(params.category || null);
  const [brand, setBrand] = useState<string | null>(null);
  const [country, setCountry] = useState<string | null>(null);
  const [thermal, setThermal] = useState<string | null>(null);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [sort, setSort] = useState("popular");
  const [page, setPage] = useState(1);
  const [filtersOpenMobile, setFiltersOpenMobile] = useState(false);

  // pick up search from SearchBar (window bridge)
  useEffect(() => {
    const s = (window as any).__jmaSearch as string | undefined;
    if (s) { setSearch(s); (window as any).__jmaSearch = undefined; }
  }, []);

  // Sync category from navigation params + reset page on filter change.
  useEffect(() => { setCat(params.category || null); }, [params.category]);
  useEffect(() => { if (params.query !== undefined) setSearch(params.query); }, [params.query]);
  useEffect(() => { setPage(1); }, [search, cat, brand, country, thermal, maxPrice, sort]);

  const qs = new URLSearchParams({ locale, sort, page: String(page), pageSize: "12" });
  if (search) qs.set("q", search);
  if (cat) qs.set("category", cat);
  if (brand) qs.set("brand", brand);
  if (country) qs.set("country", country);
  if (thermal) qs.set("thermal", thermal);
  if (maxPrice) qs.set("maxPrice", String(maxPrice));

  const { data, loading } = useFetch(`/api/catalog?${qs.toString()}`, [search, cat, brand, country, thermal, maxPrice, sort, page, locale]);

  const filters = data?.filters;
  const clearAll = () => { setCat(null); setBrand(null); setCountry(null); setThermal(null); setMaxPrice(null); setSearch(""); };
  const activeFilterCount = [cat, brand, country, thermal, maxPrice].filter(Boolean).length;

  const FilterPanel = (
    <div className="space-y-5">
      <FilterGroup label={t.catalog.category}>
        <div className="space-y-1">
          <FilterChip active={!cat} onClick={() => setCat(null)}>{locale === "fr" ? "Toutes" : "All"}</FilterChip>
          {filters?.categories?.map((c: any) => (
            <FilterChip key={c.id} active={cat === c.id} onClick={() => setCat(cat === c.id ? null : c.id)}>
              <CategoryIcon slug={c.slug} color={c.color} className="h-7 w-7 border-0 shadow-none" />
              <span className="min-w-0 truncate">{c.name}</span>
            </FilterChip>
          ))}
        </div>
      </FilterGroup>
      <FilterGroup label={t.catalog.thermalClass}>
        <div className="flex flex-wrap gap-1.5">
          {THERMALS.map((th) => (
            <FilterChip key={th} active={thermal === th} onClick={() => setThermal(thermal === th ? null : th)}>
              {th === "AMBIANT" ? (locale === "fr" ? "Ambiant" : "Ambient") : th === "REFRIGERATED" ? (locale === "fr" ? "Réfrigéré" : "Chilled") : (locale === "fr" ? "Surgelé" : "Frozen")}
            </FilterChip>
          ))}
        </div>
      </FilterGroup>
      <FilterGroup label={t.catalog.brand}>
        <div className="space-y-1">
          <FilterChip active={!brand} onClick={() => setBrand(null)}>{locale === "fr" ? "Toutes" : "All"}</FilterChip>
          {filters?.brands?.map((b: any) => (
            <FilterChip key={b.id} active={brand === b.id} onClick={() => setBrand(brand === b.id ? null : b.id)}>{b.name}</FilterChip>
          ))}
        </div>
      </FilterGroup>
      <FilterGroup label={t.catalog.country}>
        <div className="flex flex-wrap gap-1.5">
          <FilterChip active={!country} onClick={() => setCountry(null)}>{locale === "fr" ? "Tous" : "All"}</FilterChip>
          {filters?.countries?.map((c: string) => (
            <FilterChip key={c} active={country === c} onClick={() => setCountry(country === c ? null : c)}>{c}</FilterChip>
          ))}
        </div>
      </FilterGroup>
      <FilterGroup label={`${t.catalog.priceRange} (€)`}>
        <div className="flex flex-wrap gap-1.5">
          {[null, 5, 10, 15, 25].map((p) => (
            <FilterChip key={String(p)} active={maxPrice === p} onClick={() => setMaxPrice(p as any)}>
              {p === null ? (locale === "fr" ? "Tous" : "All") : `≤ ${p} €`}
            </FilterChip>
          ))}
        </div>
      </FilterGroup>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
      <div className="mb-4 flex flex-col gap-3">
        <h1 className="text-2xl font-bold text-charcoal md:text-3xl">{t.catalog.title}</h1>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t.header.searchPlaceholder} className="pl-9" />
          </div>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
            <option value="popular">{t.catalog.sortPopular}</option>
            <option value="priceAsc">{t.catalog.sortPriceAsc}</option>
            <option value="priceDesc">{t.catalog.sortPriceDesc}</option>
            <option value="new">{t.catalog.sortNew}</option>
            <option value="available">{t.catalog.sortAvailable}</option>
          </select>
          <Sheet open={filtersOpenMobile} onOpenChange={setFiltersOpenMobile}>
            <SheetTrigger asChild>
              <Button variant="outline" className="lg:hidden" aria-label={t.catalog.filters}><SlidersHorizontal className="h-4 w-4" /></Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 overflow-y-auto bg-cream">
              <SheetHeader><SheetTitle>{t.catalog.filters}</SheetTitle></SheetHeader>
              <div className="p-4">{FilterPanel}</div>
              <div className="p-4 pt-0">
                <Button onClick={clearAll} variant="outline" className="w-full">{t.catalog.clearFilters}</Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div className="flex gap-6">
        {/* desktop sidebar */}
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-24 space-y-5 rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-charcoal">{t.catalog.filters}</h2>
              <button onClick={clearAll} className="text-xs text-terre hover:underline">{t.catalog.clearFilters}</button>
            </div>
            {FilterPanel}
          </div>
        </aside>

        {/* results */}
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{t.catalog.results.replace("{count}", String(data?.total ?? 0))}</p>
            {activeFilterCount > 0 && <span className="text-xs font-semibold text-terre">{activeFilterCount} {locale === "fr" ? "filtre(s) actif(s)" : "active filter(s)"}</span>}
            {(cat || brand || country || thermal || maxPrice) && (
              <div className="hidden flex-wrap gap-1 sm:flex">
                {cat && <ActiveFilter onClear={() => setCat(null)}>{filters?.categories?.find((c:any)=>c.id===cat)?.name}</ActiveFilter>}
                {brand && <ActiveFilter onClear={() => setBrand(null)}>{filters?.brands?.find((b:any)=>b.id===brand)?.name}</ActiveFilter>}
                {country && <ActiveFilter onClear={() => setCountry(null)}>{country}</ActiveFilter>}
                {thermal && <ActiveFilter onClear={() => setThermal(null)}>{thermal}</ActiveFilter>}
              </div>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}
            </div>
          ) : data?.products?.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
              <PackageSearch className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{t.catalog.noResults}</p>
              <Button onClick={clearAll} variant="outline">{t.catalog.clearFilters}</Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                {data?.products?.map((p: any, i: number) => <ProductCard key={p.id} product={p} index={i} />)}
              </div>
              {data?.pages > 1 && (
                <div className="mt-6 flex items-center justify-center gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>{t.previous}</Button>
                  <span className="text-sm text-muted-foreground">{page} / {data.pages}</span>
                  <Button variant="outline" size="sm" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>{t.next}</Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}
function FilterChip({ active, onClick, children }: { active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-xs font-medium transition ${
        active ? "bg-terre text-cream" : "text-charcoal hover:bg-muted"
      }`}
    >
      {children}
    </button>
  );
}
function ActiveFilter({ onClear, children }: { onClear: () => void; children: React.ReactNode }) {
  return (
    <Badge variant="outline" className="gap-1 border-terre/40 bg-terre/5 text-terre">
      {children}
      <button onClick={onClear} aria-label="Retirer"><X className="h-3 w-3" /></button>
    </Badge>
  );
}
