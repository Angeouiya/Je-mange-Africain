"use client";

import { useState } from "react";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Boxes,
  ChartNoAxesCombined,
  CircleAlert,
  Download,
  Gauge,
  Layers3,
  Minus,
  PackageSearch,
  Percent,
  ShieldCheck,
  ShoppingBasket,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { AdminEmptyState, AdminErrorState, AdminSectionLoading, SectionTabs } from "@/components/admin/AdminPrimitives";
import { ProductImage } from "@/components/shared/ProductImage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime, formatPrice } from "@/lib/format";
import { useFetch } from "@/lib/use-fetch";

type Period = "30d" | "month" | "year" | "all";
type Analysis = "general" | "category" | "batch";
type AdminDestination = "catalog" | "inventory";
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
  contributionRate?: number;
  traceabilityRate?: number;
  imageUrl?: string | null;
  imageColor?: string;
  country?: string | null;
  stockQty?: number;
  reservedQty?: number;
  availableStock?: number;
  alertThreshold?: number;
};
type ProfitabilityRecommendation = {
  id: string;
  kind: "restock" | "margin" | "priority";
  productId: string;
  label: string;
  detail: string;
};
type ProfitabilityData = {
  period?: Period;
  generatedAt?: string;
  general: ProfitabilityRow;
  categories: ProfitabilityRow[];
  lots: ProfitabilityRow[];
  topProducts: ProfitabilityRow[];
  recommendations?: ProfitabilityRecommendation[];
  comparison?: {
    revenue: number | null;
    grossCost: number | null;
    margin: number | null;
    units: number | null;
    previous: ProfitabilityRow;
  } | null;
};

const PERIODS: Period[] = ["30d", "month", "year", "all"];

export function ProfitabilityPanel({ locale, onNavigate }: { locale: "fr" | "en"; onNavigate?: (destination: AdminDestination) => void }) {
  const isFr = locale === "fr";
  const [period, setPeriod] = useState<Period>("30d");
  const [analysis, setAnalysis] = useState<Analysis>("general");
  const request = useFetch<ProfitabilityData>(`/api/admin/profitability?locale=${locale}&period=${period}`, [locale, period]);

  if (request.loading && !request.data) return <AdminSectionLoading label={isFr ? "Calcul de la rentabilité réelle" : "Calculating actual profitability"} />;
  if (request.error && !request.data) return <AdminErrorState message={request.error} onRetry={request.refetch} />;
  if (!request.data) return null;
  if (!request.data.general || !Array.isArray(request.data.categories) || !Array.isArray(request.data.lots) || !Array.isArray(request.data.topProducts)) {
    return <AdminErrorState message={isFr ? "Les données de rentabilité reçues sont incomplètes." : "The profitability data received is incomplete."} onRetry={request.refetch} />;
  }

  const data = request.data;
  const metrics = data.general;
  const exportRows = analysis === "category" ? data.categories : analysis === "batch" ? data.lots : data.topProducts;
  const periodItems = PERIODS.map((value) => ({
    value,
    label: value === "30d" ? (isFr ? "30 jours" : "30 days") : value === "month" ? (isFr ? "Ce mois" : "This month") : value === "year" ? (isFr ? "Cette année" : "This year") : (isFr ? "Historique" : "All time"),
  }));

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 border-b border-charcoal/8 pb-4 2xl:flex-row 2xl:items-end 2xl:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-extrabold uppercase text-terre">{isFr ? "Lecture économique consolidée" : "Consolidated financial view"}</p>
          <h2 className="mt-1 text-lg font-black text-charcoal">{isFr ? "Coût brut, marge et décisions" : "Gross cost, margin and decisions"}</h2>
          <p className="mt-1 max-w-2xl text-[11px] leading-5 text-muted-foreground">{isFr ? "Les remises et remboursements sont intégrés. Le coût réel du lot est prioritaire dès qu'une allocation existe." : "Discounts and refunds are included. Actual batch cost takes priority whenever an allocation exists."}</p>
        </div>
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
          <SectionTabs value={period} onChange={setPeriod} label={isFr ? "Période comptable" : "Accounting period"} items={periodItems} />
          <Button type="button" variant="outline" size="sm" onClick={() => downloadProfitabilityCsv(exportRows, analysis, locale)} disabled={!exportRows.length} className="h-11 shrink-0 border-charcoal/12 sm:h-9">
            <Download className="mr-1.5 h-4 w-4" />{isFr ? "Exporter" : "Export"}
          </Button>
        </div>
      </div>

      <section data-testid="profitability-metrics" className="grid grid-cols-2 overflow-hidden rounded-lg border border-charcoal/8 bg-white xl:grid-cols-4" aria-label={isFr ? "Indicateurs de rentabilité" : "Profitability indicators"}>
        <Metric position={0} icon={ChartNoAxesCombined} label={isFr ? "Chiffre d'affaires produits" : "Product revenue"} value={formatPrice(metrics.revenue, locale)} change={data.comparison?.revenue} kind="revenue" locale={locale} />
        <Metric position={1} icon={ShoppingBasket} label={isFr ? "Coût brut vendu" : "Gross cost sold"} value={formatPrice(metrics.grossCost, locale)} change={data.comparison?.grossCost} kind="cost" locale={locale} />
        <Metric position={2} icon={TrendingUp} label={isFr ? "Marge bénéficiaire" : "Profit margin"} value={formatPrice(metrics.margin, locale)} change={data.comparison?.margin} kind="margin" locale={locale} />
        <Metric position={3} icon={Percent} label={isFr ? "Taux de marge" : "Margin rate"} value={`${formatNumber(metrics.marginRate, locale)} %`} change={null} kind="rate" locale={locale} detail={`${metrics.orders} ${isFr ? "commandes" : "orders"}`} />
      </section>

      <FinancialBridge metrics={metrics} locale={locale} generatedAt={data.generatedAt} />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SectionTabs value={analysis} onChange={setAnalysis} label={isFr ? "Niveau d'analyse" : "Analysis level"} items={[
          { value: "general", label: isFr ? "Décisions" : "Decisions", count: data.topProducts.length },
          { value: "category", label: isFr ? "Familles" : "Families", count: data.categories.length },
          { value: "batch", label: isFr ? "Lots" : "Batches", count: data.lots.length },
        ]} />
        {request.loading ? <span className="text-[10px] font-bold text-muted-foreground" role="status">{isFr ? "Actualisation des calculs…" : "Refreshing calculations…"}</span> : null}
      </div>

      {analysis === "general" ? <GeneralAnalysis data={data} locale={locale} onNavigate={onNavigate} /> : null}
      {analysis === "category" ? <BreakdownList rows={data.categories} kind="category" locale={locale} /> : null}
      {analysis === "batch" ? <BreakdownList rows={data.lots} kind="batch" locale={locale} /> : null}
    </div>
  );
}

function Metric({ position, icon: Icon, label, value, change, kind, locale, detail }: { position: number; icon: typeof TrendingUp; label: string; value: string; change?: number | null; kind: "revenue" | "cost" | "margin" | "rate"; locale: "fr" | "en"; detail?: string }) {
  const isFr = locale === "fr";
  const favourable = change === null || change === undefined ? null : kind === "cost" ? change <= 0 : change >= 0;
  const iconStyle = kind === "revenue" ? "bg-terre text-white" : kind === "cost" ? "bg-gold/20 text-charcoal" : kind === "margin" ? "bg-burgundy/10 text-burgundy" : "bg-terre/10 text-terre";
  return (
    <div className={`min-w-0 p-3 sm:p-5 ${position < 2 ? "border-b" : ""} ${position % 2 === 0 ? "border-r" : ""} border-charcoal/8 xl:border-b-0 ${position < 3 ? "xl:border-r" : "xl:border-r-0"}`}>
      <div className="flex items-start justify-between gap-2">
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-md ${iconStyle}`}><Icon className="h-4 w-4" /></span>
        <TrendBadge change={change} favourable={favourable} locale={locale} />
      </div>
      <p className="mt-4 truncate text-xl font-black tabular-nums text-charcoal sm:text-2xl">{value}</p>
      <p className="mt-1 text-[10px] font-bold leading-4 text-muted-foreground">{label}</p>
      {detail ? <p className="mt-1 text-[9px] font-semibold text-terre">{detail}</p> : null}
      {change === null && kind !== "rate" ? <p className="mt-1 text-[9px] text-muted-foreground">{isFr ? "Base historique active" : "All-time baseline"}</p> : null}
    </div>
  );
}

function TrendBadge({ change, favourable, locale }: { change?: number | null; favourable: boolean | null; locale: "fr" | "en" }) {
  if (change === undefined || change === null) return <span className="inline-flex h-6 items-center gap-1 rounded bg-muted px-2 text-[9px] font-bold text-muted-foreground"><Minus className="h-3 w-3" />{locale === "fr" ? "Référence" : "Baseline"}</span>;
  const Icon = change >= 0 ? ArrowUpRight : ArrowDownRight;
  return <span className={`inline-flex h-6 items-center gap-1 rounded px-2 text-[9px] font-black ${favourable ? "bg-burgundy/[0.07] text-burgundy" : "bg-destructive/[0.07] text-destructive"}`}><Icon className="h-3 w-3" />{change > 0 ? "+" : ""}{formatNumber(change, locale)} %</span>;
}

function FinancialBridge({ metrics, locale, generatedAt }: { metrics: ProfitabilityRow; locale: "fr" | "en"; generatedAt?: string }) {
  const isFr = locale === "fr";
  const costShare = metrics.revenue > 0 ? Math.min(100, Math.max(0, (metrics.grossCost / metrics.revenue) * 100)) : 0;
  const marginShare = Math.max(0, 100 - costShare);
  return (
    <section data-testid="profitability-bridge" className="grid overflow-hidden border-y border-charcoal/8 bg-[#F8F7F4] lg:grid-cols-[minmax(0,1.4fr)_minmax(16rem,0.6fr)]" aria-labelledby="finance-bridge-title">
      <div className="p-4 sm:p-5 lg:border-r lg:border-charcoal/8">
        <div className="flex items-start justify-between gap-4"><div><p className="text-[9px] font-black uppercase text-terre">{isFr ? "Pont de valeur" : "Value bridge"}</p><h3 id="finance-bridge-title" className="mt-1 text-sm font-black text-charcoal">{isFr ? "Chaque euro de vente expliqué" : "Every sales euro explained"}</h3></div><Badge variant="outline" className="border-charcoal/12 bg-white text-[9px] text-muted-foreground">{formatNumber(metrics.units, locale)} {isFr ? "unités" : "units"}</Badge></div>
        <div className="mt-5 flex h-3 w-full overflow-hidden rounded-sm bg-white ring-1 ring-charcoal/8" aria-hidden="true"><span className="bg-gold" style={{ width: `${costShare}%` }} /><span className={metrics.margin >= 0 ? "bg-terre" : "bg-destructive"} style={{ width: `${marginShare}%` }} /></div>
        <div className="mt-3 grid grid-cols-2 gap-4 text-[10px]"><div><span className="inline-block h-2 w-2 rounded-sm bg-gold" /> <span className="ml-1 text-muted-foreground">{isFr ? "Coût des marchandises" : "Cost of goods"}</span><strong className="mt-1 block text-sm text-charcoal">{formatNumber(costShare, locale)} %</strong></div><div><span className="inline-block h-2 w-2 rounded-sm bg-terre" /> <span className="ml-1 text-muted-foreground">{isFr ? "Marge conservée" : "Retained margin"}</span><strong className="mt-1 block text-sm text-charcoal">{formatNumber(metrics.marginRate, locale)} %</strong></div></div>
      </div>
      <div className="grid grid-cols-2 divide-x divide-charcoal/8 lg:grid-cols-1 lg:divide-x-0 lg:divide-y">
        <BridgeFact icon={ShieldCheck} label={isFr ? "Coûts rattachés aux lots" : "Costs linked to batches"} value={`${formatNumber(metrics.traceabilityRate || 0, locale)} %`} />
        <BridgeFact icon={Gauge} label={isFr ? "Dernier calcul" : "Last calculated"} value={generatedAt ? formatDateTime(generatedAt, locale) : (isFr ? "À l'instant" : "Just now")} />
      </div>
    </section>
  );
}

function BridgeFact({ icon: Icon, label, value }: { icon: typeof ShieldCheck; label: string; value: string }) {
  return <div className="flex min-w-0 items-start gap-3 p-4 sm:p-5"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-burgundy/[0.07] text-burgundy"><Icon className="h-4 w-4" /></span><div className="min-w-0"><p className="text-[9px] font-bold leading-4 text-muted-foreground">{label}</p><p className="mt-1 truncate text-xs font-black text-charcoal">{value}</p></div></div>;
}

function GeneralAnalysis({ data, locale, onNavigate }: { data: ProfitabilityData; locale: "fr" | "en"; onNavigate?: (destination: AdminDestination) => void }) {
  const isFr = locale === "fr";
  if (!data.topProducts.length) return <AdminEmptyState icon={<PackageSearch className="h-5 w-5" />} title={isFr ? "Aucune vente analysable" : "No analysable sales"} description={isFr ? "Les produits apparaîtront ici après un paiement capturé." : "Products will appear here after a captured payment."} />;
  const recommendations = data.recommendations || [];
  const maxUnits = Math.max(...data.topProducts.map((product) => product.units), 1);
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.55fr)]">
      <section className="overflow-hidden rounded-lg border border-charcoal/8 bg-white" aria-labelledby="top-products-title">
        <div className="flex items-start gap-3 border-b border-charcoal/8 px-4 py-4 sm:px-5"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-gold/20 text-charcoal"><TrendingUp className="h-4 w-4" /></span><div><h3 id="top-products-title" className="text-sm font-black text-charcoal">{isFr ? "Produits qui entraînent la demande" : "Products driving demand"}</h3><p className="mt-0.5 text-[11px] text-muted-foreground">{isFr ? "Unités, contribution, marge et couverture de stock réunies dans un même classement." : "Units, contribution, margin and stock coverage in one ranking."}</p></div></div>
        <div className="divide-y divide-border">
          {data.topProducts.map((product, index) => {
            const lowStock = typeof product.availableStock === "number" && product.availableStock <= (product.alertThreshold || 0);
            return <div key={product.id} className="grid grid-cols-[auto_2.75rem_minmax(0,1fr)_auto] items-center gap-3 px-3 py-3 sm:grid-cols-[auto_3rem_minmax(0,1fr)_6.5rem_6.5rem] sm:px-5"><span className={`grid h-7 w-7 place-items-center rounded-md text-[10px] font-black ${index < 3 ? "bg-terre text-white" : "bg-muted text-charcoal"}`}>{index + 1}</span><ProductImage src={product.imageUrl} alt={product.label} emoji="" color={product.imageColor} size="sm" className="h-11 w-11 shrink-0" rounded="rounded-md" /><div className="min-w-0"><div className="flex min-w-0 items-center gap-2"><p className="truncate text-xs font-extrabold text-charcoal">{product.label}</p>{lowStock ? <CircleAlert className="h-3.5 w-3.5 shrink-0 text-destructive" aria-label={isFr ? "Stock faible" : "Low stock"} /> : null}</div><p className="mt-0.5 truncate text-[9px] text-muted-foreground">{product.secondary || product.country || "—"} · {formatNumber(product.units, locale)} {isFr ? "unités" : "units"}</p><div className="mt-2 h-1.5 overflow-hidden rounded-sm bg-muted"><span className="block h-full bg-terre" style={{ width: `${Math.max(4, (product.units / maxUnits) * 100)}%` }} /></div></div><div className="text-right sm:hidden"><p className="text-xs font-black tabular-nums">{formatPrice(product.margin, locale)}</p><p className={`mt-0.5 text-[9px] font-bold ${lowStock ? "text-destructive" : "text-muted-foreground"}`}>{product.availableStock ?? "—"} {isFr ? "dispo." : "avail."}</p></div><div className="hidden text-right sm:block"><p className="text-[9px] text-muted-foreground">{isFr ? "Contribution" : "Contribution"}</p><p className="mt-1 text-xs font-black tabular-nums">{formatNumber(product.contributionRate || 0, locale)} %</p></div><div className="hidden text-right sm:block"><p className="text-[9px] text-muted-foreground">{isFr ? "Marge" : "Margin"}</p><p className={`mt-1 text-xs font-black tabular-nums ${product.margin < 0 ? "text-destructive" : "text-burgundy"}`}>{formatPrice(product.margin, locale)}</p></div></div>;
          })}
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-charcoal/8 bg-white" aria-labelledby="finance-decisions-title">
        <div className="border-b border-charcoal/8 bg-charcoal px-4 py-4 text-white sm:px-5"><span className="grid h-9 w-9 place-items-center rounded-md bg-gold text-charcoal"><Sparkles className="h-4 w-4" /></span><h3 id="finance-decisions-title" className="mt-3 text-sm font-black">{isFr ? "Décisions suggérées" : "Suggested decisions"}</h3><p className="mt-1 text-[10px] leading-4 text-white/65">{isFr ? "Priorités calculées à partir de la demande, du stock et de la marge." : "Priorities calculated from demand, stock and margin."}</p></div>
        {recommendations.length ? <div className="divide-y divide-border">{recommendations.slice(0, 4).map((recommendation) => {
          const Icon = recommendation.kind === "restock" ? Boxes : recommendation.kind === "margin" ? Percent : TrendingUp;
          const destination: AdminDestination = recommendation.kind === "restock" ? "inventory" : "catalog";
          return <div key={recommendation.id} className="p-4 sm:p-5"><div className="flex items-start gap-3"><span className={`grid h-8 w-8 shrink-0 place-items-center rounded-md ${recommendation.kind === "restock" ? "bg-destructive/[0.07] text-destructive" : recommendation.kind === "margin" ? "bg-gold/20 text-charcoal" : "bg-burgundy/[0.07] text-burgundy"}`}><Icon className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="truncate text-xs font-black text-charcoal">{recommendation.label}</p><p className="mt-1 text-[10px] leading-4 text-muted-foreground">{recommendation.detail}</p></div></div>{onNavigate ? <Button type="button" variant="ghost" size="sm" onClick={() => onNavigate(destination)} className="mt-2 h-8 w-full justify-between px-1 text-[10px] font-black text-terre hover:bg-transparent hover:text-terre-dark">{recommendation.kind === "restock" ? (isFr ? "Ouvrir les lots" : "Open batches") : (isFr ? "Ouvrir le produit" : "Open product")}<ArrowRight className="h-3.5 w-3.5" /></Button> : null}</div>;
        })}</div> : <div className="p-5 text-xs leading-5 text-muted-foreground">{isFr ? "Les suggestions apparaîtront avec les premières ventes analysables." : "Suggestions will appear with the first analysable sales."}</div>}
      </section>
    </div>
  );
}

function BreakdownList({ rows, kind, locale }: { rows: ProfitabilityRow[]; kind: "category" | "batch"; locale: "fr" | "en" }) {
  const isFr = locale === "fr";
  const Icon = kind === "category" ? Layers3 : Boxes;
  if (!rows.length) return <AdminEmptyState icon={<Icon className="h-5 w-5" />} title={kind === "category" ? (isFr ? "Aucune famille analysable" : "No analysable families") : (isFr ? "Aucun lot analysable" : "No analysable batches")} description={isFr ? "La ventilation sera disponible après les premières ventes tracées." : "The breakdown will become available after the first tracked sales."} />;
  return (
    <div className="overflow-hidden rounded-lg border border-charcoal/8 bg-white">
      <div className="hidden overflow-x-auto md:block"><Table><TableHeader><TableRow><TableHead>{kind === "category" ? (isFr ? "Famille" : "Family") : (isFr ? "Lot et produit" : "Batch and product")}</TableHead><TableHead>{isFr ? "Poids du CA" : "Revenue share"}</TableHead><TableHead className="text-right">{isFr ? "Unités" : "Units"}</TableHead><TableHead className="text-right">{isFr ? "Chiffre d'affaires" : "Revenue"}</TableHead><TableHead className="text-right">{isFr ? "Coût brut" : "Gross cost"}</TableHead><TableHead className="text-right">{isFr ? "Marge" : "Margin"}</TableHead><TableHead className="text-right">{isFr ? "Taux" : "Rate"}</TableHead></TableRow></TableHeader><TableBody>{rows.map((row) => <TableRow key={row.id}><TableCell><div className="flex items-center gap-2"><Icon className="h-4 w-4 text-terre" /><div><p className="text-xs font-extrabold">{row.label}</p>{row.secondary ? <p className="mt-0.5 text-[10px] text-muted-foreground">{row.secondary}</p> : null}</div></div></TableCell><TableCell><ContributionBar value={row.contributionRate || 0} locale={locale} /></TableCell><TableCell className="text-right text-xs font-bold tabular-nums">{formatNumber(row.units, locale)}</TableCell><TableCell className="text-right text-xs font-bold tabular-nums">{formatPrice(row.revenue, locale)}</TableCell><TableCell className="text-right text-xs tabular-nums text-muted-foreground">{formatPrice(row.grossCost, locale)}</TableCell><TableCell className={`text-right text-xs font-black tabular-nums ${row.margin >= 0 ? "text-burgundy" : "text-destructive"}`}>{formatPrice(row.margin, locale)}</TableCell><TableCell className="text-right text-xs font-bold tabular-nums">{formatNumber(row.marginRate, locale)} %</TableCell></TableRow>)}</TableBody></Table></div>
      <div className="divide-y divide-border md:hidden">{rows.map((row) => <article key={row.id} className="p-4"><div className="flex items-start gap-2"><Icon className="mt-0.5 h-4 w-4 shrink-0 text-terre" /><div className="min-w-0 flex-1"><p className="truncate text-xs font-extrabold">{row.label}</p>{row.secondary ? <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{row.secondary}</p> : null}</div><span className="text-right text-[10px] font-black text-terre">{formatNumber(row.contributionRate || 0, locale)} %</span></div><div className="mt-3"><ContributionBar value={row.contributionRate || 0} locale={locale} hideLabel /></div><div className="mt-3 grid grid-cols-3 border-t border-charcoal/8 pt-3 text-[9px]"><div><span className="text-muted-foreground">{isFr ? "CA" : "Revenue"}</span><strong className="mt-1 block text-xs">{formatPrice(row.revenue, locale)}</strong></div><div><span className="text-muted-foreground">{isFr ? "Brut" : "Cost"}</span><strong className="mt-1 block text-xs">{formatPrice(row.grossCost, locale)}</strong></div><div className="text-right"><span className="text-muted-foreground">{isFr ? "Marge" : "Margin"}</span><strong className={`mt-1 block text-xs ${row.margin >= 0 ? "text-burgundy" : "text-destructive"}`}>{formatPrice(row.margin, locale)}</strong><span className="mt-0.5 block text-[9px] text-muted-foreground">{formatNumber(row.marginRate, locale)} %</span></div></div></article>)}</div>
    </div>
  );
}

function ContributionBar({ value, locale, hideLabel = false }: { value: number; locale: "fr" | "en"; hideLabel?: boolean }) {
  return <div className="min-w-24"><div className="h-1.5 overflow-hidden rounded-sm bg-muted"><span className="block h-full bg-terre" style={{ width: `${Math.min(100, Math.max(value, value > 0 ? 3 : 0))}%` }} /></div>{hideLabel ? null : <p className="mt-1 text-[9px] font-bold text-muted-foreground">{formatNumber(value, locale)} %</p>}</div>;
}

function formatNumber(value: number, locale: "fr" | "en") {
  return value.toLocaleString(locale === "fr" ? "fr-FR" : "en-GB", { maximumFractionDigits: 1 });
}

function downloadProfitabilityCsv(rows: ProfitabilityRow[], analysis: Analysis, locale: "fr" | "en") {
  const isFr = locale === "fr";
  const headings = isFr
    ? ["Libellé", "Détail", "Unités", "Commandes", "Chiffre d'affaires", "Coût brut", "Marge", "Taux de marge", "Contribution"]
    : ["Label", "Detail", "Units", "Orders", "Revenue", "Gross cost", "Margin", "Margin rate", "Contribution"];
  const body = rows.map((row) => [row.label, row.secondary || "", row.units, row.orders, row.revenue, row.grossCost, row.margin, row.marginRate, row.contributionRate || 0]);
  const csv = [headings, ...body].map((line) => line.map(csvCell).join(";")).join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `je-mange-africain-rentabilite-${analysis}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function csvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}
