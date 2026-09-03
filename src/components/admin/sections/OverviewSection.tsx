"use client";

import { AlertTriangle, ArrowRight, BarChart3, Boxes, CircleDollarSign, ClipboardCheck, ShoppingBag, UsersRound } from "lucide-react";
import { AdminErrorState, AdminPageHeader, AdminSectionLoading } from "@/components/admin/AdminPrimitives";
import type { AdminSectionId, DashboardPayload } from "@/components/admin/admin-types";
import { Button } from "@/components/ui/button";
import { useFetch } from "@/lib/use-fetch";
import { formatPrice } from "@/lib/format";

export default function OverviewSection({ locale, onNavigate }: { locale: "fr" | "en"; onNavigate: (section: AdminSectionId) => void }) {
  const { data, loading, error, refetch } = useFetch<DashboardPayload>(`/api/admin/dashboard?locale=${locale}`, [locale]);
  const isFr = locale === "fr";
  if (loading) return <AdminSectionLoading label={isFr ? "Lecture de l'activité" : "Reading business activity"} />;
  if (error || !data) return <AdminErrorState message={error} onRetry={refetch} />;

  const { kpis } = data;
  const operationalAlerts = [
    {
      icon: ClipboardCheck,
      label: isFr ? "Commandes à préparer" : "Orders to prepare",
      detail: isFr ? "À valider avant la prochaine vague logistique" : "Validate before the next fulfilment wave",
      value: kpis.toPrepare,
      color: "text-terre bg-terre/10",
      target: "orders" as const,
    },
    {
      icon: Boxes,
      label: isFr ? "Produits en rupture" : "Products out of stock",
      detail: isFr ? "Offre indisponible à réapprovisionner" : "Unavailable offer requiring replenishment",
      value: kpis.outOfStock,
      color: kpis.outOfStock ? "text-destructive bg-destructive/10" : "text-forest bg-forest/10",
      target: "inventory" as const,
    },
    {
      icon: AlertTriangle,
      label: isFr ? "Lots proches de l'échéance" : "Batches nearing expiry",
      detail: isFr ? "Priorité FEFO sur les prochaines préparations" : "FEFO priority for upcoming fulfilment",
      value: kpis.expiringSoon,
      color: kpis.expiringSoon ? "text-amber-700 bg-amber-100" : "text-forest bg-forest/10",
      target: "inventory" as const,
    },
  ];

  const activityMetrics = [
    { icon: CircleDollarSign, label: isFr ? "Chiffre d'affaires aujourd'hui" : "Revenue today", value: formatPrice(kpis.revenueToday, locale), note: isFr ? "encaissé sur la journée" : "collected today", accent: "bg-terre text-white" },
    { icon: ShoppingBag, label: isFr ? "Commandes du mois" : "Orders this month", value: String(kpis.monthOrders), note: `${kpis.orders} ${isFr ? "depuis l'ouverture" : "all time"}`, accent: "bg-charcoal text-white" },
    { icon: CircleDollarSign, label: isFr ? "Panier moyen" : "Average basket", value: formatPrice(kpis.avgBasket, locale), note: isFr ? "sur le mois en cours" : "for the current month", accent: "bg-gold text-charcoal" },
    { icon: UsersRound, label: isFr ? "Clients actifs" : "Active customers", value: String(kpis.customers), note: isFr ? "comptes enregistrés" : "registered accounts", accent: "bg-forest text-white" },
  ];

  return (
    <div className="space-y-7">
      <AdminPageHeader
        variant="command"
        accent="#D65A32"
        icon={<BarChart3 className="h-5 w-5" />}
        eyebrow={isFr ? "Centre d'opérations" : "Operations centre"}
        title={isFr ? "Ce qui demande votre attention" : "What needs your attention"}
        description={isFr ? "Une lecture directe de l'activité réelle pour savoir quoi traiter maintenant, sans indicateurs décoratifs." : "A direct view of live activity so you know what to handle now, without decorative metrics."}
      />

      <section className="grid grid-cols-2 overflow-hidden rounded-lg border border-charcoal/8 bg-white xl:grid-cols-4" aria-label={isFr ? "Indicateurs essentiels" : "Essential metrics"}>
        {activityMetrics.map((metric, index) => (
          <div key={metric.label} className={`min-w-0 p-3 sm:p-5 ${index % 2 === 0 ? "border-r border-charcoal/8" : ""} ${index < 2 ? "border-b border-charcoal/8" : ""} ${index < 3 ? "xl:border-r" : "xl:border-r-0"} xl:border-b-0`}>
            <span className={`grid h-9 w-9 place-items-center rounded-md ${metric.accent}`}><metric.icon className="h-4 w-4" /></span>
            <p className="mt-3 text-xl font-black tabular-nums text-charcoal sm:mt-4 sm:text-2xl">{metric.value}</p>
            <p className="mt-1 text-xs font-bold text-charcoal">{metric.label}</p>
            <p className="mt-1 text-[10px] text-muted-foreground">{metric.note}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-7 xl:grid-cols-[minmax(0,1.25fr)_minmax(20rem,0.75fr)]">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <div><p className="text-[11px] font-extrabold uppercase text-muted-foreground">{isFr ? "File d'attention" : "Attention queue"}</p><h3 className="mt-1 text-lg font-black text-charcoal">{isFr ? "Priorités opérationnelles" : "Operational priorities"}</h3></div>
            <span className="text-xs font-bold tabular-nums text-muted-foreground">{operationalAlerts.reduce((sum, item) => sum + item.value, 0)} {isFr ? "signalements" : "signals"}</span>
          </div>
          <div className="divide-y divide-charcoal/8 border-y border-charcoal/8 bg-white">
            {operationalAlerts.map((item) => (
              <button key={item.label} type="button" onClick={() => onNavigate(item.target)} className="group flex w-full items-center gap-3 px-3 py-4 text-left transition-colors hover:bg-forest/[0.035] sm:px-4">
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-md ${item.color}`}><item.icon className="h-[18px] w-[18px]" /></span>
                <span className="min-w-0 flex-1"><span className="block text-sm font-extrabold text-charcoal">{item.label}</span><span className="mt-0.5 block text-[11px] leading-5 text-muted-foreground">{item.detail}</span></span>
                <span className="text-xl font-black tabular-nums text-charcoal">{item.value}</span>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-terre" />
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-lg bg-charcoal p-5 text-white sm:p-6">
          <p className="text-[10px] font-extrabold uppercase text-gold">{isFr ? "Performance du mois" : "Month performance"}</p>
          <p className="mt-3 text-3xl font-black tabular-nums">{formatPrice(kpis.revenueMonth, locale)}</p>
          <p className="mt-1 text-xs text-white/50">{isFr ? "Chiffre d'affaires cumulé" : "Cumulative revenue"}</p>
          <div className="my-5 h-px bg-white/10" />
          <div className="grid grid-cols-2 gap-5">
            <div><p className="text-2xl font-black tabular-nums">{kpis.monthOrders}</p><p className="mt-1 text-[10px] leading-4 text-white/45">{isFr ? "commandes ce mois" : "orders this month"}</p></div>
            <div><p className="text-2xl font-black tabular-nums">{formatPrice(kpis.avgBasket, locale)}</p><p className="mt-1 text-[10px] leading-4 text-white/45">{isFr ? "panier moyen" : "average basket"}</p></div>
          </div>
          <Button type="button" onClick={() => onNavigate("finance")} className="mt-6 w-full bg-white text-charcoal hover:bg-white/90">{isFr ? "Ouvrir le registre financier" : "Open finance ledger"}<ArrowRight className="ml-2 h-4 w-4" /></Button>
        </section>
      </div>
    </div>
  );
}
