import { ArrowUpRight, CircleAlert, Crown, Globe2, Heart, Languages, ShieldCheck, ShoppingBag, UsersRound } from "lucide-react";
import type { AdminCustomer, AdminCustomerPortfolioPayload } from "@/components/admin/admin-types";
import { formatPrice } from "@/lib/format";
import { customerSegmentDetails } from "@/components/admin/customers/customer-labels";

type Locale = "fr" | "en";

function formatNumber(value: number, locale: Locale, digits = 0) {
  return value.toLocaleString(locale === "fr" ? "fr-FR" : "en-GB", { maximumFractionDigits: digits });
}

export function CustomerPortfolioOverview({ summary, locale }: { summary: AdminCustomerPortfolioPayload["summary"]; locale: Locale }) {
  const isFr = locale === "fr";
  const metrics = [
    { icon: UsersRound, label: isFr ? "Profils clients" : "Customer profiles", value: formatNumber(summary.total, locale), detail: `${summary.markets} ${isFr ? "marchés servis" : "markets served"}`, iconClass: "bg-terre text-white" },
    { icon: ArrowUpRight, label: isFr ? "Valeur du portefeuille" : "Portfolio value", value: formatPrice(summary.lifetimeValue, locale), detail: `${formatPrice(summary.averageCustomerValue, locale)} ${isFr ? "par profil" : "per profile"}`, iconClass: "bg-gold text-charcoal" },
    { icon: ShoppingBag, label: isFr ? "Taux de réachat" : "Repeat purchase rate", value: `${formatNumber(summary.repeatRate, locale, 1)} %`, detail: `${summary.repeatCustomers} ${isFr ? "clients récurrents" : "repeat customers"}`, iconClass: "bg-burgundy text-white" },
    { icon: CircleAlert, label: isFr ? "Relations à piloter" : "Relationships to steer", value: formatNumber(summary.actionable, locale), detail: isFr ? `${summary.openTickets} demande${summary.openTickets === 1 ? "" : "s"} ouverte${summary.openTickets === 1 ? "" : "s"}` : `${summary.openTickets} open request${summary.openTickets === 1 ? "" : "s"}`, iconClass: "bg-terre/[0.08] text-terre" },
  ];
  const segmentEntries = (Object.entries(summary.segments) as Array<[AdminCustomer["segment"], number]>).filter(([, count]) => count > 0);
  const segmentColors: Record<AdminCustomer["segment"], string> = { ambassador: "bg-gold", active: "bg-burgundy", at_risk: "bg-destructive", new: "bg-terre/35" };

  return (
    <>
      <section className="grid grid-cols-2 overflow-hidden rounded-lg border border-charcoal/8 bg-white xl:grid-cols-4" aria-label={isFr ? "Santé du portefeuille client" : "Customer portfolio health"}>
        {metrics.map((metric, index) => <div key={metric.label} className={`min-w-0 p-3.5 sm:p-5 ${index % 2 === 0 ? "border-r border-charcoal/8" : ""} ${index < 2 ? "border-b border-charcoal/8" : ""} ${index < 3 ? "xl:border-r" : "xl:border-r-0"} xl:border-b-0`}><span className={`grid h-9 w-9 place-items-center rounded-md ${metric.iconClass}`}><metric.icon className="h-4 w-4" /></span><p className="mt-3 truncate text-xl font-black tabular-nums text-charcoal sm:text-2xl">{metric.value}</p><p className="mt-1 text-[11px] font-extrabold text-charcoal sm:text-xs">{metric.label}</p><p className="mt-1 text-[9px] leading-4 text-muted-foreground">{metric.detail}</p></div>)}
      </section>

      <section className="grid overflow-hidden border-y border-charcoal/8 bg-white lg:grid-cols-[minmax(0,1.15fr)_minmax(23rem,0.85fr)]" aria-labelledby="portfolio-composition-title">
        <div className="p-4 sm:p-5 lg:border-r lg:border-charcoal/8">
          <div className="flex items-end justify-between gap-3"><div><p className="text-[9px] font-black uppercase text-terre">{isFr ? "Cycle relationnel" : "Relationship lifecycle"}</p><h3 id="portfolio-composition-title" className="mt-1 text-sm font-black text-charcoal">{isFr ? "Composition du portefeuille" : "Portfolio composition"}</h3></div><span className="text-[9px] font-bold text-muted-foreground">{summary.total} {isFr ? "profils" : "profiles"}</span></div>
          <div role="img" className="mt-4 flex h-2.5 overflow-hidden rounded-sm bg-muted" aria-label={isFr ? "Répartition des segments" : "Segment distribution"}>{segmentEntries.map(([segment, count]) => <span key={segment} className={segmentColors[segment]} style={{ width: `${summary.total ? (count / summary.total) * 100 : 0}%` }} />)}</div>
          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">{(["ambassador", "active", "at_risk", "new"] as const).map((segment) => { const details = customerSegmentDetails(segment, locale); return <div key={segment} className="flex items-center gap-2"><span className={`h-2 w-2 shrink-0 rounded-sm ${segmentColors[segment]}`} /><div><strong className="block text-xs tabular-nums text-charcoal">{summary.segments[segment]}</strong><span className="text-[9px] text-muted-foreground">{details.label}</span></div></div>; })}</div>
        </div>
        <div className="grid grid-cols-2 divide-x divide-y divide-charcoal/8 sm:grid-cols-4 lg:divide-y-0">
          <PortfolioFact icon={ShieldCheck} value={`${formatNumber(summary.profileCoverageRate, locale, 1)} %`} label={isFr ? "dossiers complets" : "complete profiles"} />
          <PortfolioFact icon={Heart} value={`${formatNumber(summary.savedIntentRate, locale, 1)} %`} label={isFr ? "avec envies" : "with saved intent"} />
          <PortfolioFact icon={Globe2} value={String(summary.markets)} label={isFr ? "pays clients" : "customer markets"} />
          <PortfolioFact icon={Languages} value={`${summary.languages.fr} / ${summary.languages.en}`} label="FR / EN" />
        </div>
      </section>
    </>
  );
}

function PortfolioFact({ icon: Icon, value, label }: { icon: typeof Crown; value: string; label: string }) {
  return <div className="flex min-w-0 flex-col items-center justify-center p-3 text-center"><Icon className="h-4 w-4 text-terre" /><strong className="mt-2 truncate text-sm tabular-nums text-charcoal">{value}</strong><span className="mt-1 text-[8px] leading-3 text-muted-foreground">{label}</span></div>;
}
