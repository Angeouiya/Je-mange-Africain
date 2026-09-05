"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpDown, ChevronDown, PackageSearch, Search as SearchIcon, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useStore } from "@/lib/store";
import { dict } from "@/lib/i18n";
import { useFetch } from "@/lib/use-fetch";
import { ProductCard, type ProductListItem } from "@/components/shared/ProductCard";
import { MarketChannelSwitch } from "@/components/storefront/MarketChannelSwitch";
import { StorefrontAdvertisement } from "@/components/storefront/StorefrontAdvertisement";
import { CategoryIcon } from "@/components/shared/CategoryIcon";
import { StorefrontUnavailableState } from "@/components/storefront/StorefrontUnavailableState";

const THERMALS = ["AMBIANT", "REFRIGERATED", "FROZEN"];

type CatalogResponse = {
  products: ProductListItem[];
  total: number;
  page: number;
  pages: number;
  filters: {
    categories: Array<{ id: string; slug: string; name: string; color?: string | null }>;
    brands: Array<{ id: string; name: string }>;
    countries: string[];
  };
};

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
  const [sort, setSort] = useState(params.sort || "popular");
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
  useEffect(() => { if (params.sort) setSort(params.sort); }, [params.sort]);
  useEffect(() => { setPage(1); }, [search, cat, brand, country, thermal, maxPrice, sort]);

  const qs = new URLSearchParams({ locale, sort, page: String(page), pageSize: "12" });
  if (search) qs.set("q", search);
  if (cat) qs.set("category", cat);
  if (brand) qs.set("brand", brand);
  if (country) qs.set("country", country);
  if (thermal) qs.set("thermal", thermal);
  if (maxPrice) qs.set("maxPrice", String(maxPrice));

  const { data, loading, error, refetch } = useFetch<CatalogResponse>(`/api/catalog?${qs.toString()}`, [search, cat, brand, country, thermal, maxPrice, sort, page, locale]);

  const filters = data?.filters;
  const clearFilters = () => { setCat(null); setBrand(null); setCountry(null); setThermal(null); setMaxPrice(null); };
  const clearAll = () => { clearFilters(); setSearch(""); };
  const activeFilterCount = [cat, brand, country, thermal, maxPrice].filter(Boolean).length;
  const totalPages = data?.pages ?? 0;
  const activeFilters = [
    cat ? { key: "category", label: filters?.categories.find((item) => item.id === cat)?.name || t.catalog.category, onClear: () => setCat(null) } : null,
    brand ? { key: "brand", label: filters?.brands.find((item) => item.id === brand)?.name || t.catalog.brand, onClear: () => setBrand(null) } : null,
    country ? { key: "country", label: country, onClear: () => setCountry(null) } : null,
    thermal ? { key: "thermal", label: thermalLabel(thermal, locale), onClear: () => setThermal(null) } : null,
    maxPrice ? { key: "price", label: `≤ ${maxPrice} €`, onClear: () => setMaxPrice(null) } : null,
  ].filter((filter): filter is { key: string; label: string; onClear: () => void } => Boolean(filter));

  const FilterPanel = (
    <div className="space-y-5">
      <FilterGroup label={t.catalog.category}>
        <div className="space-y-1">
          <FilterChip active={!cat} onClick={() => setCat(null)}>{locale === "fr" ? "Toutes" : "All"}</FilterChip>
          {filters?.categories?.map((c) => (
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
          {filters?.brands?.map((b) => (
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
            <FilterChip key={String(p)} active={maxPrice === p} onClick={() => setMaxPrice(p)}>
              {p === null ? (locale === "fr" ? "Tous" : "All") : `≤ ${p} €`}
            </FilterChip>
          ))}
        </div>
      </FilterGroup>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-5 md:px-7 md:py-10 lg:px-8">
      <div className="mb-5 flex flex-col gap-3 border-b border-charcoal/10 pb-5 md:mb-6 md:gap-4 md:pb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="jma-eyebrow">{locale === "fr" ? "Catalogue vivant" : "Live catalogue"}</p><h1 className="jma-section-title mt-1">{t.catalog.title}</h1></div><MarketChannelSwitch channel="retail" /></div>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 sm:flex">
          <div className="relative col-span-2 flex-1 sm:col-span-1">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={locale === "fr" ? "Nom, origine, marque ou ingrédient..." : "Name, origin, brand or ingredient..."}
              aria-label={locale === "fr" ? "Rechercher dans le catalogue" : "Search the catalogue"}
              className="h-11 border-charcoal/12 bg-white pl-9 pr-10"
            />
            {search ? <button type="button" onClick={() => setSearch("")} aria-label={locale === "fr" ? "Effacer la recherche" : "Clear search"} className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted-foreground hover:text-terre"><X className="h-4 w-4" /></button> : null}
          </div>
          <div className="relative min-w-0 flex-1 sm:flex-none">
            <ArrowUpDown className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-terre" />
            <select value={sort} onChange={(e) => setSort(e.target.value as NonNullable<typeof params.sort>)} aria-label={locale === "fr" ? "Trier les produits" : "Sort products"} className="h-11 w-full min-w-0 appearance-none rounded-md border border-charcoal/12 bg-white pl-9 pr-8 text-sm font-semibold text-charcoal sm:w-48">
              <option value="popular">{t.catalog.sortPopular}</option>
              <option value="priceAsc">{t.catalog.sortPriceAsc}</option>
              <option value="priceDesc">{t.catalog.sortPriceDesc}</option>
              <option value="new">{t.catalog.sortNew}</option>
              <option value="available">{t.catalog.sortAvailable}</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
          <Sheet open={filtersOpenMobile} onOpenChange={setFiltersOpenMobile}>
            <SheetTrigger asChild>
              <Button variant="outline" className="relative h-11 w-11 border-charcoal/12 bg-white p-0 text-charcoal lg:hidden" aria-label={`${t.catalog.filters}${activeFilterCount ? `, ${activeFilterCount}` : ""}`}>
                <SlidersHorizontal className="h-4 w-4" />
                {activeFilterCount ? <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-burgundy px-1 text-[9px] font-black text-white">{activeFilterCount}</span> : null}
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[min(22rem,calc(100vw-1rem))] overflow-y-auto bg-white p-0">
              <SheetHeader className="border-b border-charcoal/10 px-4 py-4"><SheetTitle className="flex items-center gap-2">{t.catalog.filters}{activeFilterCount ? <span className="grid h-5 min-w-5 place-items-center rounded-full bg-burgundy px-1 text-[9px] font-black text-white">{activeFilterCount}</span> : null}</SheetTitle></SheetHeader>
              <div className="p-4 pb-6">{FilterPanel}</div>
              <div className={`sticky bottom-0 grid gap-2 border-t border-charcoal/10 bg-white/96 p-4 backdrop-blur ${activeFilterCount ? "grid-cols-[auto_minmax(0,1fr)]" : "grid-cols-1"}`}>
                {activeFilterCount ? <Button onClick={clearFilters} variant="outline" className="border-charcoal/12 px-3">{locale === "fr" ? "Effacer" : "Clear"}</Button> : null}
                <Button onClick={() => setFiltersOpenMobile(false)} className="bg-terre text-white hover:bg-terre-dark">{locale === "fr" ? `Voir ${data?.total ?? 0} produits` : `View ${data?.total ?? 0} products`}</Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <StorefrontAdvertisement placement="catalog" className="mb-5 md:mb-6" />

      <div className="flex gap-6">
        {/* desktop sidebar */}
        <aside data-testid="catalog-filter-sidebar" className="hidden w-64 shrink-0 border-r border-charcoal/10 pr-6 lg:block">
          <div className="sticky top-24 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-charcoal">{t.catalog.filters}</h2>
              <button onClick={clearFilters} className="text-xs text-terre hover:underline">{t.catalog.clearFilters}</button>
            </div>
            {FilterPanel}
          </div>
        </aside>

        {/* results */}
        <div className="min-w-0 flex-1">
          <div className="mb-3 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold text-muted-foreground sm:text-sm">{t.catalog.results.replace("{count}", String(data?.total ?? 0))}</p>
              {activeFilterCount > 0 ? <button type="button" onClick={clearFilters} className="shrink-0 text-[11px] font-extrabold text-terre hover:underline lg:hidden">{t.catalog.clearFilters}</button> : null}
              {activeFilters.length ? <div className="hidden flex-wrap justify-end gap-1.5 lg:flex">{activeFilters.map((filter) => <ActiveFilter key={filter.key} onClear={filter.onClear} ariaLabel={locale === "fr" ? `Retirer le filtre ${filter.label}` : `Remove ${filter.label} filter`}>{filter.label}</ActiveFilter>)}</div> : null}
            </div>
            {activeFilters.length ? <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:hidden" aria-label={locale === "fr" ? "Filtres actifs" : "Active filters"}>{activeFilters.map((filter) => <ActiveFilter key={filter.key} onClear={filter.onClear} ariaLabel={locale === "fr" ? `Retirer le filtre ${filter.label}` : `Remove ${filter.label} filter`}>{filter.label}</ActiveFilter>)}</div> : null}
          </div>

          {loading ? (
            <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 md:gap-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="aspect-[3/4] rounded-md" />)}
            </div>
          ) : error ? (
            <StorefrontUnavailableState surface="catalog" locale={locale} onRetry={refetch} />
          ) : data?.products?.length === 0 ? (
            <section className="flex min-h-80 flex-col items-center justify-center border-y border-charcoal/10 px-4 py-14 text-center">
              <span className="grid h-16 w-16 place-items-center rounded-lg border border-terre/12 bg-terre/[0.055] text-terre"><PackageSearch className="h-7 w-7" strokeWidth={1.7} /></span>
              <h2 className="mt-5 font-display text-2xl font-semibold text-charcoal">{locale === "fr" ? "Aucune référence trouvée" : "No matching product"}</h2>
              <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{t.catalog.noResults}</p>
              <Button onClick={clearAll} variant="outline" className="mt-5 border-terre/25 text-terre hover:bg-terre/5 hover:text-terre">{t.catalog.clearFilters}</Button>
            </section>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 md:gap-3 xl:grid-cols-4" data-testid="catalog-product-grid">
                {data?.products?.map((product, index) => <ProductCard key={product.id} product={product} index={index} compact />)}
              </div>
              {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-center gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>{t.previous}</Button>
                  <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>{t.next}</Button>
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
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex min-h-9 w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-xs font-semibold transition ${
        active ? "bg-burgundy text-white shadow-sm" : "text-charcoal hover:bg-burgundy/[0.045]"
      }`}
    >
      {children}
    </button>
  );
}
function ActiveFilter({ onClear, ariaLabel, children }: { onClear: () => void; ariaLabel: string; children: React.ReactNode }) {
  return (
    <Badge variant="outline" className="gap-1 border-terre/40 bg-terre/5 text-terre">
      {children}
      <button type="button" onClick={onClear} aria-label={ariaLabel}><X className="h-3 w-3" /></button>
    </Badge>
  );
}

function thermalLabel(thermal: string, locale: "fr" | "en") {
  if (thermal === "AMBIANT") return locale === "fr" ? "Ambiant" : "Ambient";
  if (thermal === "REFRIGERATED") return locale === "fr" ? "Réfrigéré" : "Chilled";
  return locale === "fr" ? "Surgelé" : "Frozen";
}
