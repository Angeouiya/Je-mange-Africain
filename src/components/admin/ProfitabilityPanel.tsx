"use client";

import { useState } from "react";
import { Boxes, ChartNoAxesCombined, Layers3, PackageSearch, Percent, ShoppingBasket, TrendingUp } from "lucide-react";
import { AdminEmptyState, AdminErrorState, AdminSectionLoading, SectionTabs } from "@/components/admin/AdminPrimitives";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useFetch } from "@/lib/use-fetch";
import { formatPrice } from "@/lib/format";

type Period = "30d" | "month" | "year" | "all";
type Analysis = "general" | "category" | "batch";
type ProfitabilityRow = {
  id: string;
  label: string;
  secondary: string | null;
  revenue: number;
  grossCost: number;
  margin: number;
  marginRate: number;
  units: number;
  orders: number;
};
type ProfitabilityData = {
  general: ProfitabilityRow;
  categories: ProfitabilityRow[];
  lots: ProfitabilityRow[];
  topProducts: ProfitabilityRow[];
};

export function ProfitabilityPanel({ locale }: { locale: "fr" | "en" }) {
  const isFr = locale === "fr";
  const [period, setPeriod] = useState<Period>("all");
  const [analysis, setAnalysis] = useState<Analysis>("general");
  const { data, loading, error, refetch } = useFetch<ProfitabilityData>(`/api/admin/profitability?locale=${locale}&period=${period}`, [locale, period]);

  if (loading && !data) return <AdminSectionLoading label={isFr ? "Calcul de la rentabilité réelle" : "Calculating actual profitability"} />;
  if (error && !data) return <AdminErrorState message={error} onRetry={refetch} />;
  if (!data) return null;
  if (!data.general || !Array.isArray(data.categories) || !Array.isArray(data.lots) || !Array.isArray(data.topProducts)) {
    return <AdminErrorState message={isFr ? "Les données de rentabilité reçues sont incomplètes." : "The profitability data received is incomplete."} onRetry={refetch} />;
  }

  const metrics = data.general;
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div><p className="text-[10px] font-extrabold uppercase text-terre">{isFr ? "Analyse de rentabilité" : "Profitability analysis"}</p><h2 className="mt-1 text-lg font-black text-charcoal">{isFr ? "Coût brut et marge réelle" : "Gross cost and actual margin"}</h2><p className="mt-1 max-w-2xl text-[11px] leading-5 text-muted-foreground">{isFr ? "Les remises sont réparties sur les lignes vendues. Le coût réel du lot est utilisé lorsqu'il est tracé." : "Discounts are allocated across sold lines. Actual batch cost is used whenever it is traceable."}</p></div>
        <label className="flex items-center gap-2 text-xs font-bold text-charcoal"><span>{isFr ? "Période" : "Period"}</span><select value={period} onChange={(event) => setPeriod(event.target.value as Period)} className="h-9 rounded-md border border-input bg-white px-3 text-xs shadow-xs"><option value="all">{isFr ? "Tout l'historique" : "All history"}</option><option value="year">{isFr ? "Cette année" : "This year"}</option><option value="month">{isFr ? "Ce mois" : "This month"}</option><option value="30d">{isFr ? "30 derniers jours" : "Last 30 days"}</option></select></label>
      </div>

      <section data-testid="profitability-metrics" className="grid grid-cols-3 overflow-hidden rounded-lg border border-charcoal/8 bg-white sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={ChartNoAxesCombined} label={isFr ? "Chiffre d'affaires produits" : "Product revenue"} value={formatPrice(metrics.revenue, locale)} featured />
        <Metric icon={ShoppingBasket} label={isFr ? "Coût brut" : "Gross cost"} value={formatPrice(metrics.grossCost, locale)} />
        <Metric icon={TrendingUp} label={isFr ? "Marge bénéficiaire" : "Profit margin"} value={formatPrice(metrics.margin, locale)} positive={metrics.margin >= 0} />
        <Metric icon={Percent} label={isFr ? "Taux de marge" : "Margin rate"} value={`${metrics.marginRate.toLocaleString(isFr ? "fr-FR" : "en-GB", { maximumFractionDigits: 1 })} %`} positive={metrics.marginRate >= 0} />
      </section>

      <SectionTabs value={analysis} onChange={setAnalysis} label={isFr ? "Niveau d'analyse" : "Analysis level"} items={[
        { value: "general", label: isFr ? "Vue générale" : "Overview" },
        { value: "category", label: isFr ? "Familles" : "Families", count: data.categories.length },
        { value: "batch", label: isFr ? "Lots" : "Batches", count: data.lots.length },
      ]} />

      {analysis === "general" ? <GeneralAnalysis data={data} locale={locale} /> : null}
      {analysis === "category" ? <BreakdownList rows={data.categories} kind="category" locale={locale} /> : null}
      {analysis === "batch" ? <BreakdownList rows={data.lots} kind="batch" locale={locale} /> : null}
    </div>
  );
}

function Metric({ icon: Icon, label, value, featured = false, positive }: { icon: typeof TrendingUp; label: string; value: string; featured?: boolean; positive?: boolean }) {
  return <div className={`min-w-0 border-b border-r border-charcoal/8 p-3 last:border-r-0 sm:col-span-1 sm:p-4 xl:border-b-0 xl:last:border-r-0 ${featured ? "col-span-3 bg-charcoal text-white sm:col-span-1" : ""}`}><span className={`grid h-7 w-7 place-items-center rounded-md sm:h-8 sm:w-8 ${featured ? "bg-terre text-white" : positive === false ? "bg-destructive/10 text-destructive" : "bg-forest/10 text-forest"}`}><Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" /></span><p className={`mt-3 truncate font-black tabular-nums ${featured ? "text-2xl text-white sm:text-xl" : positive === false ? "text-sm text-destructive sm:text-xl" : "text-sm text-charcoal sm:text-xl"}`}>{value}</p><p className={`mt-1 line-clamp-2 min-h-7 text-[9px] font-bold leading-3.5 sm:min-h-0 sm:text-[10px] ${featured ? "text-white/70" : "text-muted-foreground"}`}>{label}</p></div>;
}

function GeneralAnalysis({ data, locale }: { data: ProfitabilityData; locale: "fr" | "en" }) {
  const isFr = locale === "fr";
  if (!data.topProducts.length) return <AdminEmptyState icon={<PackageSearch className="h-5 w-5" />} title={isFr ? "Aucune vente analysable" : "No analysable sales"} description={isFr ? "Les produits apparaîtront ici après un paiement capturé." : "Products will appear here after a captured payment."} />;
  return (
    <section className="overflow-hidden rounded-lg border border-charcoal/8 bg-white">
      <div className="flex items-start gap-3 border-b border-charcoal/8 px-4 py-4 sm:px-5"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-gold/20 text-amber-800"><TrendingUp className="h-4 w-4" /></span><div><h3 className="text-sm font-black text-charcoal">{isFr ? "Produits les plus achetés" : "Most purchased products"}</h3><p className="mt-0.5 text-[11px] text-muted-foreground">{isFr ? "Classement par unités vendues pour guider le réapprovisionnement et la mise en avant." : "Ranked by units sold to guide replenishment and merchandising."}</p></div></div>
      <div className="divide-y divide-border">
        {data.topProducts.map((product, index) => <div key={product.id} className="grid grid-cols-[32px_1fr_auto] items-center gap-3 px-4 py-3 sm:grid-cols-[36px_1fr_110px_110px_auto] sm:px-5"><span className={`grid h-7 w-7 place-items-center rounded-md text-xs font-black ${index < 3 ? "bg-terre text-white" : "bg-muted text-charcoal"}`}>{index + 1}</span><div className="min-w-0"><p className="truncate text-xs font-extrabold text-charcoal">{product.label}</p><p className="mt-0.5 truncate text-[10px] text-muted-foreground">{product.secondary || "—"} · {product.units} {isFr ? "unités" : "units"}</p></div><p className="hidden text-right text-xs font-black tabular-nums sm:block">{formatPrice(product.revenue, locale)}</p><p className={`hidden text-right text-xs font-black tabular-nums sm:block ${product.margin >= 0 ? "text-forest" : "text-destructive"}`}>{formatPrice(product.margin, locale)}</p>{index < 3 ? <Badge className="border-0 bg-gold/20 text-[9px] text-amber-900">{isFr ? "Stock prioritaire" : "Priority stock"}</Badge> : <span className="text-right text-[10px] font-bold text-muted-foreground">{product.orders} {isFr ? "cmd." : "orders"}</span>}</div>)}
      </div>
    </section>
  );
}

function BreakdownList({ rows, kind, locale }: { rows: ProfitabilityRow[]; kind: "category" | "batch"; locale: "fr" | "en" }) {
  const isFr = locale === "fr";
  const Icon = kind === "category" ? Layers3 : Boxes;
  if (!rows.length) return <AdminEmptyState icon={<Icon className="h-5 w-5" />} title={kind === "category" ? (isFr ? "Aucune famille analysable" : "No analysable families") : (isFr ? "Aucun lot analysable" : "No analysable batches")} description={isFr ? "La ventilation sera disponible après les premières ventes tracées." : "The breakdown will become available after the first tracked sales."} />;
  return (
    <div className="overflow-hidden rounded-lg border border-charcoal/8 bg-white">
      <div className="hidden overflow-x-auto md:block"><Table><TableHeader><TableRow><TableHead>{kind === "category" ? (isFr ? "Famille" : "Family") : (isFr ? "Lot et produit" : "Batch and product")}</TableHead><TableHead className="text-right">{isFr ? "Unités" : "Units"}</TableHead><TableHead className="text-right">{isFr ? "Chiffre d'affaires" : "Revenue"}</TableHead><TableHead className="text-right">{isFr ? "Coût brut" : "Gross cost"}</TableHead><TableHead className="text-right">{isFr ? "Marge" : "Margin"}</TableHead><TableHead className="text-right">{isFr ? "Taux" : "Rate"}</TableHead></TableRow></TableHeader><TableBody>{rows.map((row) => <TableRow key={row.id}><TableCell><div className="flex items-center gap-2"><Icon className="h-4 w-4 text-terre" /><div><p className="text-xs font-extrabold">{row.label}</p>{row.secondary ? <p className="mt-0.5 text-[10px] text-muted-foreground">{row.secondary}</p> : null}</div></div></TableCell><TableCell className="text-right text-xs font-bold tabular-nums">{row.units}</TableCell><TableCell className="text-right text-xs font-bold tabular-nums">{formatPrice(row.revenue, locale)}</TableCell><TableCell className="text-right text-xs tabular-nums text-muted-foreground">{formatPrice(row.grossCost, locale)}</TableCell><TableCell className={`text-right text-xs font-black tabular-nums ${row.margin >= 0 ? "text-forest" : "text-destructive"}`}>{formatPrice(row.margin, locale)}</TableCell><TableCell className="text-right text-xs font-bold tabular-nums">{row.marginRate.toLocaleString(isFr ? "fr-FR" : "en-GB", { maximumFractionDigits: 1 })} %</TableCell></TableRow>)}</TableBody></Table></div>
      <div className="divide-y divide-border md:hidden">{rows.map((row) => <div key={row.id} className="p-4"><div className="flex items-start gap-2"><Icon className="mt-0.5 h-4 w-4 shrink-0 text-terre" /><div className="min-w-0"><p className="truncate text-xs font-extrabold">{row.label}</p>{row.secondary ? <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{row.secondary}</p> : null}</div><span className="ml-auto text-[10px] font-bold text-muted-foreground">{row.units} {isFr ? "unités" : "units"}</span></div><div className="mt-3 grid grid-cols-3 border-t border-charcoal/8 pt-3 text-[9px]"><div><span className="text-muted-foreground">{isFr ? "CA" : "Revenue"}</span><strong className="mt-1 block text-xs">{formatPrice(row.revenue, locale)}</strong></div><div><span className="text-muted-foreground">{isFr ? "Brut" : "Cost"}</span><strong className="mt-1 block text-xs">{formatPrice(row.grossCost, locale)}</strong></div><div className="text-right"><span className="text-muted-foreground">{isFr ? "Marge" : "Margin"}</span><strong className={`mt-1 block text-xs ${row.margin >= 0 ? "text-forest" : "text-destructive"}`}>{formatPrice(row.margin, locale)}</strong></div></div></div>)}</div>
    </div>
  );
}
