"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { IconFunction } from "reicon/createIcon";
import { ArrowSwapHorizontal } from "reicon/icons/ArrowSwapHorizontal";
import { BadgePercent } from "reicon/icons/BadgePercent";
import { BoxSearch } from "reicon/icons/BoxSearch";
import { CheckCircle } from "reicon/icons/CheckCircle";
import { ChevronDown } from "reicon/icons/ChevronDown";
import { CupTrophy } from "reicon/icons/CupTrophy";
import { Search as SearchIcon } from "reicon/icons/Search";
import { Sliders } from "reicon/icons/Sliders";
import { Sparkle } from "reicon/icons/Sparkle";
import { Star } from "reicon/icons/Star";
import { X } from "reicon/icons/X";
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
import { StorefrontWorkspaceHeader } from "@/components/storefront/StorefrontWorkspaceHeader";
import { CategoryIcon } from "@/components/shared/CategoryIcon";
import { StorefrontUnavailableState } from "@/components/storefront/StorefrontUnavailableState";
import { STOREFRONT_DATA_TTL_MS } from "@/lib/storefront-prefetch";
import { ReiconGlyph } from "@/components/ui/reicon-glyph";

const THERMALS = ["AMBIANT", "REFRIGERATED", "FROZEN"];
type CatalogHighlight = "all" | "available" | "sale" | "new" | "recommended" | "popular";

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
  const [highlight, setHighlight] = useState<CatalogHighlight>("all");
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
  useEffect(() => { setPage(1); }, [search, cat, brand, country, thermal, maxPrice, highlight, sort]);

  const qs = new URLSearchParams({ locale, sort, page: String(page), pageSize: "12" });
  if (search) qs.set("q", search);
  if (cat) qs.set("category", cat);
  if (brand) qs.set("brand", brand);
  if (country) qs.set("country", country);
  if (thermal) qs.set("thermal", thermal);
  if (maxPrice) qs.set("maxPrice", String(maxPrice));
  if (highlight !== "all") qs.set("highlight", highlight);

  const { data, loading, error, refetch } = useFetch<CatalogResponse>(`/api/catalog?${qs.toString()}`, [search, cat, brand, country, thermal, maxPrice, highlight, sort, page, locale], {}, { cache: true, ttlMs: STOREFRONT_DATA_TTL_MS });

  const filters = data?.filters;
  const clearFilters = () => { setCat(null); setBrand(null); setCountry(null); setThermal(null); setMaxPrice(null); setHighlight("all"); };
  const clearAll = () => { clearFilters(); setSearch(""); };
  const activeFilterCount = [cat, brand, country, thermal, maxPrice, highlight !== "all" ? highlight : null].filter(Boolean).length;
  const totalPages = data?.pages ?? 0;
  const highlightLabels: Record<CatalogHighlight, string> = {
    all: locale === "fr" ? "Tout" : "All",
    available: locale === "fr" ? "Disponible" : "Available",
    sale: locale === "fr" ? "Promos" : "Deals",
    new: locale === "fr" ? "Nouveautés" : "New",
    recommended: locale === "fr" ? "Recommandés" : "Recommended",
    popular: locale === "fr" ? "Populaires" : "Popular",
  };
  const quickSelections = [
    { id: "all" as const, label: highlightLabels.all, detail: locale === "fr" ? "Toute l'offre" : "Whole offer", icon: Sparkle },
    { id: "available" as const, label: highlightLabels.available, detail: locale === "fr" ? "Prêt à livrer" : "Ready to ship", icon: CheckCircle },
    { id: "sale" as const, label: highlightLabels.sale, detail: locale === "fr" ? "Prix remisés" : "Marked down", icon: BadgePercent },
    { id: "new" as const, label: highlightLabels.new, detail: locale === "fr" ? "Dernières entrées" : "Latest arrivals", icon: Star },
    { id: "recommended" as const, label: highlightLabels.recommended, detail: locale === "fr" ? "Choix maison" : "House picks", icon: Sparkle },
    { id: "popular" as const, label: highlightLabels.popular, detail: locale === "fr" ? "Plus achetés" : "Most bought", icon: CupTrophy },
  ];
  const activeFilters = [
    highlight !== "all" ? { key: "highlight", label: highlightLabels[highlight], onClear: () => setHighlight("all") } : null,
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
          <FilterChip active={!cat} onClick={() => setCat(null)}>
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-white/65 bg-white/85 text-burgundy"><ReiconGlyph icon={BoxSearch} weight="Filled" className="h-3.5 w-3.5" /></span>
            <span className="min-w-0 truncate">{locale === "fr" ? "Toutes" : "All"}</span>
          </FilterChip>
          {filters?.categories?.map((c) => (
            <FilterChip key={c.id} active={cat === c.id} onClick={() => setCat(cat === c.id ? null : c.id)}>
              <CategoryIcon slug={c.slug} label={c.name} color={c.color} active={cat === c.id} className="h-7 w-7 shadow-none" />
              <span className="min-w-0 truncate">{c.name}</span>
            </FilterChip>
          ))}
        </div>
      </FilterGroup>
      <FilterGroup label={t.catalog.thermalClass}>
        <div className="flex flex-wrap gap-1.5">
          {THERMALS.map((th) => (
            <FilterChip key={th} active={thermal === th} onClick={() => setThermal(thermal === th ? null : th)} layout="pill">
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
          <FilterChip active={!country} onClick={() => setCountry(null)} layout="pill">{locale === "fr" ? "Tous" : "All"}</FilterChip>
          {filters?.countries?.map((c: string) => (
            <FilterChip key={c} active={country === c} onClick={() => setCountry(country === c ? null : c)} layout="pill">{c}</FilterChip>
          ))}
        </div>
      </FilterGroup>
      <FilterGroup label={`${t.catalog.priceRange} (€)`}>
        <div className="flex flex-wrap gap-1.5">
          {[null, 5, 10, 15, 25].map((p) => (
            <FilterChip key={String(p)} active={maxPrice === p} onClick={() => setMaxPrice(p)} layout="pill">
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
        <StorefrontWorkspaceHeader
          icon={BoxSearch}
          eyebrow={locale === "fr" ? "Marché vivant" : "Live market"}
          title={t.catalog.title}
          description={locale === "fr" ? "Produits authentiques, disponibilité réelle, promotions et ingrédients prêts à basculer vers une recette." : "Authentic products, live availability, promotions and ingredients ready to become a recipe basket."}
          signals={[
            { icon: BoxSearch, value: loading ? "..." : String(data?.total ?? 0), label: locale === "fr" ? "références" : "items", tone: "burgundy" },
            { icon: CheckCircle, value: locale === "fr" ? "Stock" : "Stock", label: locale === "fr" ? "temps réel" : "live", tone: "earth" },
            { icon: BadgePercent, value: locale === "fr" ? "Promos" : "Deals", label: locale === "fr" ? "prix visibles" : "visible prices", tone: "gold" },
          ]}
          flow={[
            { icon: SearchIcon, label: locale === "fr" ? "Chercher" : "Search", detail: locale === "fr" ? "Nom, pays ou ingrédient" : "Name, country or ingredient", tone: "burgundy", active: Boolean(search) },
            { icon: Sliders, label: locale === "fr" ? "Filtrer" : "Filter", detail: locale === "fr" ? "Rayon, prix, origine" : "Aisle, price, origin", tone: "earth", active: activeFilterCount > 0 },
            { icon: CheckCircle, label: locale === "fr" ? "Choisir" : "Choose", detail: locale === "fr" ? "Image, stock et remise" : "Image, stock and deal", tone: "gold" },
          ]}
          switcher={<MarketChannelSwitch channel="retail" />}
        />
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 sm:flex">
          <div className="relative col-span-2 flex-1 sm:col-span-1">
            <ReiconGlyph icon={SearchIcon} className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={locale === "fr" ? "Nom, origine, marque ou ingrédient..." : "Name, origin, brand or ingredient..."}
              aria-label={locale === "fr" ? "Rechercher dans le catalogue" : "Search the catalogue"}
              className="h-11 border-charcoal/12 bg-white pl-9 pr-10"
            />
            {search ? <button type="button" onClick={() => setSearch("")} aria-label={locale === "fr" ? "Effacer la recherche" : "Clear search"} className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted-foreground hover:text-terre"><ReiconGlyph icon={X} className="h-4 w-4" /></button> : null}
          </div>
          <div className="relative min-w-0 flex-1 sm:flex-none">
            <ReiconGlyph icon={ArrowSwapHorizontal} className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-terre" />
            <select value={sort} onChange={(e) => setSort(e.target.value as NonNullable<typeof params.sort>)} aria-label={locale === "fr" ? "Trier les produits" : "Sort products"} className="h-11 w-full min-w-0 appearance-none rounded-md border border-charcoal/12 bg-white pl-9 pr-8 text-sm font-semibold text-charcoal sm:w-48">
              <option value="popular">{t.catalog.sortPopular}</option>
              <option value="priceAsc">{t.catalog.sortPriceAsc}</option>
              <option value="priceDesc">{t.catalog.sortPriceDesc}</option>
              <option value="new">{t.catalog.sortNew}</option>
              <option value="available">{t.catalog.sortAvailable}</option>
            </select>
            <ReiconGlyph icon={ChevronDown} className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
          <Sheet open={filtersOpenMobile} onOpenChange={setFiltersOpenMobile}>
            <SheetTrigger asChild>
              <Button variant="outline" className="relative h-11 w-11 border-charcoal/12 bg-white p-0 text-charcoal lg:hidden" aria-label={`${t.catalog.filters}${activeFilterCount ? `, ${activeFilterCount}` : ""}`}>
                <ReiconGlyph icon={Sliders} className="h-4 w-4" />
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
        <div className="-mx-4 flex min-w-0 gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden" role="group" aria-label={locale === "fr" ? "Sélections rapides du catalogue" : "Catalog quick selections"}>
          {quickSelections.map((selection) => (
            <QuickSelectionButton
              key={selection.id}
              active={highlight === selection.id}
              icon={selection.icon}
              detail={selection.detail}
              onClick={() => setHighlight(selection.id)}
            >
              {selection.label}
            </QuickSelectionButton>
          ))}
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
              <span className="grid h-16 w-16 place-items-center rounded-lg border border-terre/12 bg-terre/[0.055] text-terre"><ReiconGlyph icon={BoxSearch} weight="Filled" className="h-7 w-7" /></span>
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
function FilterChip({ active, onClick, children, layout = "full" }: { active?: boolean; onClick: () => void; children: React.ReactNode; layout?: "full" | "pill" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex min-h-9 items-center gap-2 rounded-md border px-2.5 py-1.5 text-left text-xs font-semibold transition ${
        layout === "full" ? "w-full justify-start" : "w-auto shrink-0 justify-center"
      } ${
        active ? "border-burgundy bg-[linear-gradient(135deg,#8A3042,#B9472B)] text-white shadow-[0_12px_24px_-20px_rgba(90,38,50,0.82)]" : "border-charcoal/10 bg-white text-charcoal hover:border-terre/25 hover:bg-terre/[0.035]"
      }`}
    >
      {children}
    </button>
  );
}

function QuickSelectionButton({ active, icon, detail, onClick, children }: { active: boolean; icon: IconFunction; detail: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={typeof children === "string" ? children : undefined}
      className={`inline-flex min-h-12 min-w-[5.65rem] shrink-0 items-center gap-2 rounded-md border px-2.5 py-1.5 text-left transition sm:min-w-[7.2rem] ${
        active ? "border-burgundy bg-[linear-gradient(135deg,#8A3042,#B9472B)] text-white shadow-[0_14px_28px_-22px_rgba(90,38,50,0.88)]" : "border-charcoal/10 bg-white text-charcoal hover:border-terre/30 hover:bg-terre/[0.035]"
      }`}
    >
      <ReiconGlyph icon={icon} weight={active ? "Filled" : "Outline"} className="h-4 w-4" />
      <span className="min-w-0">
        <span className="block truncate text-[10px] font-black leading-3">{children}</span>
        <span aria-hidden="true" className={`mt-0.5 block truncate text-[7.5px] font-bold leading-3 ${active ? "text-white/70" : "text-muted-foreground"}`}>{detail}</span>
      </span>
    </button>
  );
}

function ActiveFilter({ onClear, ariaLabel, children }: { onClear: () => void; ariaLabel: string; children: React.ReactNode }) {
  return (
    <Badge variant="outline" className="gap-1 border-terre/40 bg-terre/5 text-terre">
      {children}
      <button type="button" onClick={onClear} aria-label={ariaLabel}><ReiconGlyph icon={X} className="h-3 w-3" /></button>
    </Badge>
  );
}

function thermalLabel(thermal: string, locale: "fr" | "en") {
  if (thermal === "AMBIANT") return locale === "fr" ? "Ambiant" : "Ambient";
  if (thermal === "REFRIGERATED") return locale === "fr" ? "Réfrigéré" : "Chilled";
  return locale === "fr" ? "Surgelé" : "Frozen";
}
