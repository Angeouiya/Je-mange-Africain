"use client";

import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Boxes,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  Minus,
  PackageCheck,
  ReceiptText,
  ShoppingBag,
  Sparkles,
  TimerReset,
  Truck,
  UsersRound,
} from "lucide-react";
import { AdminErrorState, AdminPageHeader, AdminSectionLoading } from "@/components/admin/AdminPrimitives";
import type { AdminSectionId, DashboardPayload } from "@/components/admin/admin-types";
import { ProductImage } from "@/components/shared/ProductImage";
import { Badge } from "@/components/ui/badge";
import { useFetch } from "@/lib/use-fetch";
import { formatDateTime, formatPrice, orderStatusColor } from "@/lib/format";

type Locale = "fr" | "en";
type Priority = DashboardPayload["priorities"][number];

const workflowMeta: Record<DashboardPayload["workflow"][number]["id"], { icon: LucideIcon; fr: string; en: string; detailFr: string; detailEn: string }> = {
  validate: { icon: ReceiptText, fr: "Qualifier", en: "Qualify", detailFr: "Paiement et réservation", detailEn: "Payment and reservation" },
  prepare: { icon: PackageCheck, fr: "Préparer", en: "Prepare", detailFr: "Picking et contrôle", detailEn: "Picking and checks" },
  deliver: { icon: Truck, fr: "Acheminer", en: "Deliver", detailFr: "Transport en cours", detailEn: "In carrier network" },
  closed: { icon: CheckCircle2, fr: "Clôturer", en: "Close", detailFr: "Livrées ou terminées", detailEn: "Delivered or completed" },
};

const priorityMeta: Record<Priority["level"], { icon: LucideIcon; labelFr: string; labelEn: string; className: string; iconClassName: string }> = {
  critical: { icon: AlertTriangle, labelFr: "Critique", labelEn: "Critical", className: "border-destructive/20 bg-destructive/[0.035]", iconClassName: "bg-destructive/10 text-destructive" },
  attention: { icon: TimerReset, labelFr: "À traiter", labelEn: "Action", className: "border-terre/20 bg-terre/[0.035]", iconClassName: "bg-terre/10 text-terre" },
  monitor: { icon: Activity, labelFr: "À surveiller", labelEn: "Monitor", className: "border-gold/35 bg-gold/[0.055]", iconClassName: "bg-gold/20 text-charcoal" },
};

const statusLabels: Record<string, [string, string]> = {
  cart: ["Brouillon", "Draft"],
  validated: ["Validée", "Validated"],
  paymentPending: ["Paiement attendu", "Payment pending"],
  paymentConfirmed: ["Paiement confirmé", "Payment confirmed"],
  stockReserved: ["Stock réservé", "Stock reserved"],
  preparing: ["En préparation", "Preparing"],
  packed: ["Colis prêt", "Packed"],
  controlDone: ["Contrôle terminé", "Quality checked"],
  shipped: ["Expédiée", "Shipped"],
  in_transit: ["En transit", "In transit"],
  out_for_delivery: ["En livraison", "Out for delivery"],
  delivering: ["En livraison", "Delivering"],
  delivered: ["Livrée", "Delivered"],
  cancelled: ["Annulée", "Cancelled"],
  failed: ["Échec", "Failed"],
  refunded: ["Remboursée", "Refunded"],
};

function formatNumber(value: number, locale: Locale, maximumFractionDigits = 0) {
  return value.toLocaleString(locale === "fr" ? "fr-FR" : "en-GB", { maximumFractionDigits });
}

function ComparisonBadge({ value, locale }: { value: number | null; locale: Locale }) {
  if (value === null) return <span className="inline-flex h-6 items-center gap-1 rounded bg-gold/15 px-2 text-[9px] font-black text-charcoal"><Sparkles className="h-3 w-3" />{locale === "fr" ? "Nouvelle base" : "New baseline"}</span>;
  const Icon = value > 0 ? ArrowUpRight : value < 0 ? ArrowDownRight : Minus;
  return <span className={`inline-flex h-6 items-center gap-1 rounded px-2 text-[9px] font-black ${value >= 0 ? "bg-burgundy/[0.07] text-burgundy" : "bg-destructive/[0.07] text-destructive"}`}><Icon className="h-3 w-3" />{value > 0 ? "+" : ""}{formatNumber(value, locale, 1)} %</span>;
}

function MetricCell({ icon: Icon, label, value, detail, comparison, tone, position, locale }: { icon: LucideIcon; label: string; value: string; detail: string; comparison?: number | null; tone: "terre" | "gold" | "burgundy" | "soft"; position: number; locale: Locale }) {
  const iconClass = tone === "terre" ? "bg-terre text-white" : tone === "gold" ? "bg-gold text-charcoal" : tone === "burgundy" ? "bg-burgundy text-white" : "bg-terre/[0.08] text-terre";
  return (
    <div className={`min-w-0 p-3.5 sm:p-5 ${position % 2 === 0 ? "border-r border-charcoal/8" : ""} ${position < 2 ? "border-b border-charcoal/8" : ""} ${position < 3 ? "xl:border-r" : "xl:border-r-0"} xl:border-b-0`}>
      <div className="flex items-start justify-between gap-2"><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-md ${iconClass}`}><Icon className="h-4 w-4" /></span>{comparison !== undefined ? <ComparisonBadge value={comparison} locale={locale} /> : null}</div>
      <p className="mt-3 text-xl font-black tabular-nums text-charcoal sm:text-2xl">{value}</p>
      <p className="mt-1 text-[11px] font-extrabold text-charcoal sm:text-xs">{label}</p>
      <p className="mt-1 text-[9px] leading-4 text-muted-foreground sm:text-[10px]">{detail}</p>
    </div>
  );
}

function RevenuePulse({ data, locale }: { data: DashboardPayload; locale: Locale }) {
  const isFr = locale === "fr";
  const maxRevenue = Math.max(1, ...data.pulse.map((day) => day.revenue));
  return (
    <section className="border border-charcoal/8 bg-white" aria-labelledby="revenue-pulse-title">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-charcoal/8 px-4 py-4 sm:px-5">
        <div><p className="text-[9px] font-black uppercase text-terre">{isFr ? "Dynamique commerciale" : "Commercial pulse"}</p><h3 id="revenue-pulse-title" className="mt-1 text-sm font-black text-charcoal">{isFr ? "Sept jours d'encaissement" : "Seven days of collected revenue"}</h3></div>
        <div className="flex items-center gap-5 text-right"><div><p className="text-[9px] text-muted-foreground">{isFr ? "Commandes du mois" : "Monthly orders"}</p><p className="mt-1 text-sm font-black tabular-nums text-charcoal">{formatNumber(data.kpis.monthOrders, locale)}</p></div><ComparisonBadge value={data.comparison.orders} locale={locale} /></div>
      </div>
      <div className="px-3 pb-4 pt-5 sm:px-5">
        <ol className="grid h-40 grid-cols-7 gap-2 sm:gap-3" aria-label={isFr ? "Chiffre d'affaires quotidien sur sept jours" : "Daily revenue over seven days"}>
          {data.pulse.map((day) => {
            const height = day.revenue > 0 ? Math.max(8, (day.revenue / maxRevenue) * 100) : 2;
            return (
              <li key={day.date} className="flex min-w-0 flex-col items-center justify-end gap-2" data-testid="dashboard-pulse-bar">
                <span className="hidden text-[8px] font-bold tabular-nums text-muted-foreground sm:block">{day.orders ? formatPrice(day.revenue, locale) : "—"}</span>
                <span className="flex h-24 w-full max-w-9 items-end overflow-hidden rounded-sm bg-terre/[0.045]" title={`${day.label}: ${formatPrice(day.revenue, locale)}, ${day.orders} ${isFr ? "commandes" : "orders"}`}><span className="block w-full rounded-sm bg-terre transition-[height] duration-500" style={{ height: `${height}%` }} /></span>
                <span className="text-[9px] font-extrabold capitalize text-charcoal">{day.label}</span>
              </li>
            );
          })}
        </ol>
        <div className="mt-4 grid grid-cols-2 border-t border-charcoal/8 pt-4 text-[10px]"><div><p className="text-muted-foreground">{isFr ? "Panier moyen" : "Average basket"}</p><div className="mt-1.5 flex items-center gap-2"><strong className="text-sm tabular-nums text-charcoal">{formatPrice(data.kpis.avgBasket, locale)}</strong><ComparisonBadge value={data.comparison.averageBasket} locale={locale} /></div></div><div className="border-l border-charcoal/8 pl-4"><p className="text-muted-foreground">{isFr ? "Nouveaux clients" : "New customers"}</p><strong className="mt-1.5 block text-sm tabular-nums text-charcoal">+{formatNumber(data.kpis.newCustomersMonth, locale)}</strong></div></div>
      </div>
    </section>
  );
}

function PriorityQueue({ priorities, locale, onNavigate }: { priorities: Priority[]; locale: Locale; onNavigate: (section: AdminSectionId) => void }) {
  const isFr = locale === "fr";
  return (
    <section className="border border-charcoal/8 bg-white" aria-labelledby="priority-queue-title">
      <div className="flex items-start justify-between gap-4 border-b border-charcoal/8 px-4 py-4 sm:px-5"><div><p className="text-[9px] font-black uppercase text-terre">{isFr ? "File d'attention" : "Attention queue"}</p><h3 id="priority-queue-title" className="mt-1 text-sm font-black text-charcoal">{isFr ? "Décisions à prendre maintenant" : "Decisions to make now"}</h3></div><span className="grid h-8 min-w-8 place-items-center rounded-md bg-terre/10 px-2 text-xs font-black text-terre">{priorities.length}</span></div>
      {priorities.length ? <div className="divide-y divide-charcoal/8">{priorities.slice(0, 5).map((priority) => {
        const meta = priorityMeta[priority.level];
        const Icon = meta.icon;
        return <button key={priority.id} type="button" onClick={() => onNavigate(priority.target)} className={`group flex w-full items-start gap-3 border-l-2 px-3 py-3 text-left transition hover:bg-terre/[0.035] sm:px-4 ${meta.className}`}><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-md ${meta.iconClassName}`}><Icon className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><span className="text-xs font-black text-charcoal">{priority.title}</span><span className="text-[8px] font-black uppercase text-muted-foreground">{isFr ? meta.labelFr : meta.labelEn}</span></span><span className="mt-1 block text-[10px] leading-4 text-muted-foreground">{priority.detail}</span></span><span className="mt-0.5 text-base font-black tabular-nums text-charcoal">{priority.count}</span><ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-terre" /></button>;
      })}</div> : <div className="flex min-h-52 flex-col items-center justify-center px-6 text-center"><span className="grid h-11 w-11 place-items-center rounded-lg bg-burgundy/[0.07] text-burgundy"><CheckCircle2 className="h-5 w-5" /></span><p className="mt-3 text-sm font-black text-charcoal">{isFr ? "Aucune urgence ouverte" : "No open urgency"}</p><p className="mt-1 max-w-xs text-[10px] leading-4 text-muted-foreground">{isFr ? "Les flux critiques sont sous contrôle à cet instant." : "Critical workflows are currently under control."}</p></div>}
    </section>
  );
}

function WorkflowRail({ data, locale, onNavigate }: { data: DashboardPayload; locale: Locale; onNavigate: (section: AdminSectionId) => void }) {
  const isFr = locale === "fr";
  const active = data.workflow.slice(0, 3).reduce((sum, stage) => sum + stage.count, 0);
  return (
    <section aria-labelledby="workflow-title">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3"><div><p className="text-[9px] font-black uppercase text-terre">{isFr ? "Chaîne d'exécution" : "Execution chain"}</p><h3 id="workflow-title" className="mt-1 text-base font-black text-charcoal">{isFr ? "Où se trouve chaque commande" : "Where every order stands"}</h3></div><button type="button" onClick={() => onNavigate("orders")} className="inline-flex h-9 items-center gap-2 rounded-md border border-charcoal/10 bg-white px-3 text-[10px] font-black text-charcoal transition hover:border-terre/30 hover:text-terre">{formatNumber(active, locale)} {isFr ? "actives" : "active"}<ArrowRight className="h-3.5 w-3.5" /></button></div>
      <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-charcoal/8 bg-white lg:grid-cols-4">
        {data.workflow.map((stage, index) => {
          const meta = workflowMeta[stage.id];
          const Icon = meta.icon;
          return <button key={stage.id} type="button" onClick={() => onNavigate("orders")} className={`group min-w-0 p-4 text-left transition hover:bg-terre/[0.035] ${index % 2 === 0 ? "border-r border-charcoal/8" : ""} ${index < 2 ? "border-b border-charcoal/8" : ""} ${index < 3 ? "lg:border-r" : "lg:border-r-0"} lg:border-b-0`}><div className="flex items-center justify-between gap-2"><span className={`grid h-9 w-9 place-items-center rounded-md ${index === 0 ? "bg-terre/10 text-terre" : index === 1 ? "bg-gold/20 text-charcoal" : index === 2 ? "bg-burgundy/[0.08] text-burgundy" : "bg-muted text-muted-foreground"}`}><Icon className="h-4 w-4" /></span><span className="text-xl font-black tabular-nums text-charcoal">{stage.count}</span></div><p className="mt-3 text-xs font-black text-charcoal">{isFr ? meta.fr : meta.en}</p><p className="mt-1 text-[9px] text-muted-foreground">{isFr ? meta.detailFr : meta.detailEn}</p></button>;
        })}
      </div>
    </section>
  );
}

function RecentOrders({ orders, locale, onNavigate }: { orders: DashboardPayload["recentOrders"]; locale: Locale; onNavigate: (section: AdminSectionId) => void }) {
  const isFr = locale === "fr";
  return (
    <section className="border border-charcoal/8 bg-white" aria-labelledby="recent-orders-title">
      <div className="flex items-center justify-between gap-3 border-b border-charcoal/8 px-4 py-4"><div><p className="text-[9px] font-black uppercase text-terre">{isFr ? "Activité récente" : "Recent activity"}</p><h3 id="recent-orders-title" className="mt-1 text-sm font-black text-charcoal">{isFr ? "Dernières commandes" : "Latest orders"}</h3></div><button type="button" onClick={() => onNavigate("orders")} aria-label={isFr ? "Ouvrir toutes les commandes" : "Open all orders"} title={isFr ? "Toutes les commandes" : "All orders"} className="grid h-8 w-8 place-items-center rounded-md border border-charcoal/10 text-muted-foreground transition hover:border-terre/30 hover:text-terre"><ArrowRight className="h-4 w-4" /></button></div>
      <div className="divide-y divide-charcoal/8">{orders.length ? orders.map((order) => <button key={order.id} type="button" onClick={() => onNavigate("orders")} className="grid w-full grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-left transition hover:bg-terre/[0.025]"><ProductImage src={order.imageUrl} alt="" emoji="" color="#D65A32" size="sm" className="h-10 w-10 shrink-0" rounded="rounded-md" /><span className="min-w-0"><span className="flex min-w-0 items-center gap-2"><strong className="truncate text-[11px] text-charcoal">{order.number}</strong><Badge className={`hidden border text-[8px] sm:inline-flex ${orderStatusColor(order.status)}`}>{(statusLabels[order.status] || [order.status, order.status])[isFr ? 0 : 1]}</Badge></span><span className="mt-1 block truncate text-[9px] text-muted-foreground">{order.deliveryName} · {order.deliveryCity} · {order.itemCount} {isFr ? "articles" : "items"}</span></span><span className="text-right"><strong className="block text-xs tabular-nums text-charcoal">{formatPrice(order.total, locale)}</strong><span className="mt-1 block text-[8px] text-muted-foreground">{formatDateTime(order.createdAt, locale)}</span></span></button>) : <p className="px-4 py-10 text-center text-xs text-muted-foreground">{isFr ? "Aucune commande récente." : "No recent orders."}</p>}</div>
    </section>
  );
}

function TopProducts({ products, locale, onNavigate }: { products: DashboardPayload["topProducts"]; locale: Locale; onNavigate: (section: AdminSectionId) => void }) {
  const isFr = locale === "fr";
  const maxUnits = Math.max(1, ...products.map((product) => product.units));
  return (
    <section className="border border-charcoal/8 bg-white" aria-labelledby="top-products-title">
      <div className="flex items-center justify-between gap-3 border-b border-charcoal/8 px-4 py-4"><div><p className="text-[9px] font-black uppercase text-terre">{isFr ? "Demande du mois" : "Monthly demand"}</p><h3 id="top-products-title" className="mt-1 text-sm font-black text-charcoal">{isFr ? "Produits les plus achetés" : "Most purchased products"}</h3></div><button type="button" onClick={() => onNavigate("finance")} aria-label={isFr ? "Analyser la rentabilité" : "Analyse profitability"} title={isFr ? "Rentabilité" : "Profitability"} className="grid h-8 w-8 place-items-center rounded-md border border-charcoal/10 text-muted-foreground transition hover:border-terre/30 hover:text-terre"><BarChart3 className="h-4 w-4" /></button></div>
      <div className="divide-y divide-charcoal/8">{products.length ? products.map((product, index) => <button key={product.productId} type="button" onClick={() => onNavigate("catalog")} className="grid w-full grid-cols-[1.5rem_2.5rem_minmax(0,1fr)_auto] items-center gap-2.5 px-4 py-3 text-left transition hover:bg-terre/[0.025]"><span className={`grid h-6 w-6 place-items-center rounded text-[9px] font-black ${index < 3 ? "bg-terre text-white" : "bg-muted text-charcoal"}`}>{index + 1}</span><ProductImage src={product.imageUrl} alt={product.name} emoji="" color={product.imageColor} size="sm" className="h-10 w-10 shrink-0" rounded="rounded-md" /><span className="min-w-0"><strong className="block truncate text-[11px] text-charcoal">{product.name}</strong><span className="mt-2 block h-1.5 overflow-hidden rounded-sm bg-terre/[0.06]"><span className="block h-full bg-terre" style={{ width: `${Math.max(5, (product.units / maxUnits) * 100)}%` }} /></span></span><span className="text-right"><strong className="block text-xs tabular-nums text-charcoal">{formatNumber(product.units, locale)}</strong><span className="mt-1 block text-[8px] text-muted-foreground">{formatPrice(product.revenue, locale)}</span></span></button>) : <p className="px-4 py-10 text-center text-xs text-muted-foreground">{isFr ? "Les ventes du mois apparaîtront ici." : "Monthly sales will appear here."}</p>}</div>
    </section>
  );
}

export default function OverviewSection({ locale, onNavigate }: { locale: Locale; onNavigate: (section: AdminSectionId) => void }) {
  const { data, loading, error, refetch } = useFetch<DashboardPayload>(`/api/admin/dashboard?locale=${locale}`, [locale]);
  const isFr = locale === "fr";
  if (loading) return <AdminSectionLoading label={isFr ? "Lecture de l'activité" : "Reading business activity"} />;
  if (error || !data) return <AdminErrorState message={error} onRetry={refetch} />;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        variant="flow"
        accent="#B9472B"
        icon={<BarChart3 className="h-5 w-5" />}
        eyebrow={isFr ? "Centre d'opérations" : "Operations centre"}
        title={isFr ? "Ce qui demande votre attention" : "What needs your attention"}
        description={isFr ? "Commencez par les signaux prioritaires, puis suivez le commerce, les commandes et le stock depuis une seule vue de décision." : "Start with priority signals, then follow commerce, orders and stock from one decision view."}
        action={<div className="inline-flex h-9 items-center gap-2 rounded-md border border-charcoal/10 bg-white px-3 text-[9px] font-bold text-muted-foreground"><Activity className="h-3.5 w-3.5 text-terre" /><span><span className="block text-charcoal">{isFr ? "Données synchronisées" : "Data synchronised"}</span>{formatDateTime(data.generatedAt, locale)}</span></div>}
      />

      <section className="grid grid-cols-2 overflow-hidden rounded-lg border border-charcoal/8 bg-white xl:grid-cols-4" aria-label={isFr ? "Indicateurs de décision" : "Decision metrics"}>
        <MetricCell position={0} locale={locale} icon={CircleDollarSign} label={isFr ? "Encaissé aujourd'hui" : "Collected today"} value={formatPrice(data.kpis.revenueToday, locale)} detail={isFr ? "paiements nets reconnus" : "recognised net payments"} tone="terre" />
        <MetricCell position={1} locale={locale} icon={ShoppingBag} label={isFr ? "Chiffre d'affaires du mois" : "Monthly revenue"} value={formatPrice(data.kpis.revenueMonth, locale)} detail={isFr ? "contre la même période précédente" : "against the previous matching period"} comparison={data.comparison.revenue} tone="gold" />
        <MetricCell position={2} locale={locale} icon={ClipboardCheck} label={isFr ? "Commandes actives" : "Active orders"} value={formatNumber(data.kpis.activeOrders, locale)} detail={`${data.kpis.toPrepare} ${isFr ? "à qualifier avant préparation" : "to qualify before fulfilment"}`} tone="burgundy" />
        <MetricCell position={3} locale={locale} icon={Boxes} label={isFr ? "Catalogue disponible" : "Available catalogue"} value={`${formatNumber(data.kpis.stockCoverageRate, locale, 1)} %`} detail={`${data.kpis.outOfStock} ${isFr ? "produits indisponibles" : "unavailable products"}`} tone="soft" />
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.18fr)_minmax(20rem,0.82fr)]">
        <RevenuePulse data={data} locale={locale} />
        <PriorityQueue priorities={data.priorities} locale={locale} onNavigate={onNavigate} />
      </div>

      <WorkflowRail data={data} locale={locale} onNavigate={onNavigate} />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.08fr)_minmax(20rem,0.92fr)]">
        <RecentOrders orders={data.recentOrders} locale={locale} onNavigate={onNavigate} />
        <TopProducts products={data.topProducts} locale={locale} onNavigate={onNavigate} />
      </div>

      <div className="grid grid-cols-3 overflow-hidden rounded-lg border border-charcoal/8 bg-white text-center" aria-label={isFr ? "Repères complémentaires" : "Additional signals"}>
        <div className="p-3"><Truck className="mx-auto h-4 w-4 text-terre" /><strong className="mt-2 block text-sm tabular-nums text-charcoal">{data.kpis.inDelivery}</strong><span className="mt-1 block text-[8px] text-muted-foreground">{isFr ? "en acheminement" : "in delivery"}</span></div>
        <div className="border-x border-charcoal/8 p-3"><UsersRound className="mx-auto h-4 w-4 text-burgundy" /><strong className="mt-2 block text-sm tabular-nums text-charcoal">{formatNumber(data.kpis.customers, locale)}</strong><span className="mt-1 block text-[8px] text-muted-foreground">{isFr ? "clients enregistrés" : "registered customers"}</span></div>
        <div className="p-3"><ReceiptText className="mx-auto h-4 w-4 text-gold" /><strong className="mt-2 block text-sm tabular-nums text-charcoal">{data.kpis.paymentAttention}</strong><span className="mt-1 block text-[8px] text-muted-foreground">{isFr ? "paiements à revoir" : "payments to review"}</span></div>
      </div>
    </div>
  );
}
