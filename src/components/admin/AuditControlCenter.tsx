"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Boxes,
  ChevronRight,
  CircleAlert,
  Download,
  Fingerprint,
  KeyRound,
  Megaphone,
  PackageSearch,
  ReceiptText,
  RotateCcw,
  ScrollText,
  ShieldCheck,
  ShoppingBag,
  UserRoundCog,
  UsersRound,
} from "lucide-react";
import { AdminEmptyState, AdminErrorState, AdminSearchField, AdminSectionLoading, SectionTabs } from "@/components/admin/AdminPrimitives";
import type { AuditEntry, AuditPayload } from "@/components/admin/admin-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDateTime, normalize } from "@/lib/format";
import { useFetch } from "@/lib/use-fetch";

type AuditPeriod = "24h" | "7d" | "30d" | "all";
type RiskFilter = "all" | NonNullable<AuditEntry["risk"]>;
type DomainFilter = "all" | NonNullable<AuditEntry["domain"]>;

const EMPTY_LOGS: AuditEntry[] = [];
const DOMAIN_ORDER: DomainFilter[] = ["all", "access", "stock", "catalog", "fulfillment", "customers", "marketing", "finance", "system"];

export function AuditControlCenter({ locale }: { locale: "fr" | "en" }) {
  const isFr = locale === "fr";
  const [period, setPeriod] = useState<AuditPeriod>("30d");
  const [risk, setRisk] = useState<RiskFilter>("all");
  const [domain, setDomain] = useState<DomainFilter>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<AuditEntry | null>(null);
  const request = useFetch<AuditPayload>(`/api/admin/audit?locale=${locale}&period=${period}`, [locale, period]);
  const logs = request.data?.logs ?? EMPTY_LOGS;
  const filtered = useMemo(() => logs.filter((log) => {
    const matchesRisk = risk === "all" || log.risk === risk;
    const matchesDomain = domain === "all" || log.domain === domain;
    const matchesQuery = normalize(`${actionLabel(log.action, locale)} ${log.action} ${log.entityType} ${log.entityId || ""} ${log.reason || ""} ${log.actor || ""} ${log.ip || ""}`).includes(normalize(query));
    return matchesRisk && matchesDomain && matchesQuery;
  }), [domain, locale, logs, query, risk]);
  const summary = request.data?.summary;
  const filteredCritical = filtered.filter((log) => log.risk === "critical").length;
  const filtersActive = risk !== "all" || domain !== "all" || Boolean(query);

  if (request.loading && !request.data) return <AdminSectionLoading label={isFr ? "Qualification des preuves d'activité" : "Qualifying activity evidence"} />;
  if (request.error && !request.data) return <AdminErrorState message={request.error} onRetry={request.refetch} />;
  if (!request.data || !summary) return null;

  return (
    <div className="space-y-5">
      <section className="grid grid-cols-2 overflow-hidden rounded-lg border border-charcoal/8 bg-white xl:grid-cols-4" aria-label={isFr ? "Santé du journal d'audit" : "Audit log health"}>
        <AuditMetric position={0} icon={ScrollText} label={isFr ? "Événements sur la période" : "Events in period"} value={String(summary.total)} detail={request.data.hasMore ? `${summary.loaded} ${isFr ? "derniers détaillés" : "latest detailed"}` : (isFr ? "périmètre complet" : "complete scope")} tone="earth" />
        <AuditMetric position={1} icon={AlertTriangle} label={isFr ? "Actions sensibles" : "Sensitive actions"} value={String(summary.risk.critical)} detail={isFr ? "suppression, rappel ou suspension" : "deletion, recall or suspension"} tone={summary.risk.critical ? "alert" : "gold"} />
        <AuditMetric position={2} icon={UsersRound} label={isFr ? "Acteurs identifiés" : "Identified actors"} value={String(summary.actors)} detail={isFr ? "sur les événements détaillés" : "across detailed events"} tone="burgundy" />
        <AuditMetric position={3} icon={ShieldCheck} label={isFr ? "Complétude moyenne" : "Average completeness"} value={`${formatNumber(summary.evidenceRate, locale)} %`} detail={`${formatNumber(summary.networkRate, locale)} % ${isFr ? "avec contexte réseau" : "with network context"}`} tone="gold" />
      </section>

      {summary.risk.critical ? <div className="flex items-start gap-3 border-y border-destructive/20 bg-destructive/[0.045] px-4 py-3 text-xs leading-5 text-destructive"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /><p><strong>{isFr ? "Contrôle prioritaire" : "Priority review"}</strong> · {isFr ? `${summary.risk.critical} ${summary.risk.critical === 1 ? "action sensible figure" : "actions sensibles figurent"} dans les ${summary.loaded} événements détaillés. Vérifiez leur motif et leur différence avant/après.` : `${summary.risk.critical} sensitive ${summary.risk.critical === 1 ? "action appears" : "actions appear"} in the ${summary.loaded} detailed events. Review the reason and before/after evidence.`}</p></div> : null}

      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <SectionTabs value={period} onChange={setPeriod} label={isFr ? "Période du journal" : "Log period"} items={[
          { value: "24h", label: "24 h" },
          { value: "7d", label: isFr ? "7 jours" : "7 days" },
          { value: "30d", label: isFr ? "30 jours" : "30 days" },
          { value: "all", label: isFr ? "Historique" : "All time" },
        ]} />
        <Button type="button" variant="outline" size="sm" onClick={() => downloadAuditCsv(filtered, locale)} disabled={!filtered.length} className="h-10 shrink-0 border-charcoal/12"><Download className="mr-1.5 h-4 w-4" />{isFr ? "Exporter la vue" : "Export view"}</Button>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_12rem_14rem_auto] lg:items-start">
        <AdminSearchField value={query} onChange={setQuery} label={isFr ? "Rechercher dans le journal" : "Search the log"} placeholder={isFr ? "Action, acteur, entité ou motif" : "Action, actor, entity or reason"} resultCount={filtered.length} totalCount={logs.length} locale={locale} />
        <FilterSelect label={isFr ? "Niveau de risque" : "Risk level"} value={risk} onChange={(value) => setRisk(value as RiskFilter)} options={["all", "critical", "attention", "routine"]} optionLabel={(value) => riskLabel(value as RiskFilter, locale)} />
        <FilterSelect label={isFr ? "Domaine métier" : "Business domain"} value={domain} onChange={(value) => setDomain(value as DomainFilter)} options={DOMAIN_ORDER} optionLabel={(value) => domainLabel(value as DomainFilter, locale)} />
        <Button type="button" variant="ghost" size="sm" disabled={!filtersActive} onClick={() => { setRisk("all"); setDomain("all"); setQuery(""); }} className="h-10 px-3 text-[10px] text-muted-foreground"><RotateCcw className="mr-1.5 h-3.5 w-3.5" />{isFr ? "Réinitialiser" : "Reset"}</Button>
      </div>

      {filtered.length ? <section className="overflow-hidden rounded-lg border border-charcoal/8 bg-white" aria-label={isFr ? "Registre des preuves" : "Evidence register"}>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-charcoal/8 bg-[#F8F7F4] px-4 py-3 sm:px-5"><div><p className="text-[9px] font-black uppercase text-terre">{isFr ? "Périmètre visible" : "Visible scope"}</p><h3 className="mt-0.5 text-sm font-black text-charcoal">{filtered.length} {isFr ? `preuve${filtered.length === 1 ? "" : "s"} qualifiée${filtered.length === 1 ? "" : "s"}` : `qualified event${filtered.length === 1 ? "" : "s"}`}</h3></div>{filteredCritical ? <Badge variant="outline" className="border-destructive/25 bg-destructive/[0.04] text-[9px] text-destructive"><AlertTriangle className="mr-1 h-3 w-3" />{filteredCritical} {isFr ? "prioritaire(s)" : "priority"}</Badge> : <Badge variant="outline" className="border-forest/20 bg-white text-[9px] text-forest"><ShieldCheck className="mr-1 h-3 w-3" />{isFr ? "Aucune action critique" : "No critical action"}</Badge>}</div>
        <ol className="divide-y divide-border">{filtered.map((log) => <AuditRow key={log.id} log={log} locale={locale} onOpen={() => setSelected(log)} />)}</ol>
      </section> : <AdminEmptyState icon={<ScrollText className="h-5 w-5" />} title={isFr ? "Aucune preuve dans cette vue" : "No evidence in this view"} description={isFr ? "Élargissez la période ou réinitialisez les filtres de risque et de domaine." : "Widen the period or reset the risk and domain filters."} />}

      <AuditDetailDialog log={selected} locale={locale} onOpenChange={(open) => { if (!open) setSelected(null); }} />
    </div>
  );
}

function AuditMetric({ position, icon: Icon, label, value, detail, tone }: { position: number; icon: typeof ScrollText; label: string; value: string; detail: string; tone: "earth" | "alert" | "burgundy" | "gold" }) {
  const style = tone === "earth" ? "bg-terre text-white" : tone === "alert" ? "bg-destructive/10 text-destructive" : tone === "burgundy" ? "bg-forest/10 text-forest" : "bg-gold/25 text-charcoal";
  return <div className={`min-w-0 p-3 sm:p-5 ${position < 2 ? "border-b" : ""} ${position % 2 === 0 ? "border-r" : ""} border-charcoal/8 xl:border-b-0 ${position < 3 ? "xl:border-r" : "xl:border-r-0"}`}><span className={`grid h-9 w-9 place-items-center rounded-md ${style}`}><Icon className="h-4 w-4" /></span><p className="mt-3 text-xl font-black tabular-nums text-charcoal sm:text-2xl">{value}</p><p className="mt-1 text-xs font-bold text-charcoal">{label}</p><p className="mt-1 text-[9px] leading-4 text-muted-foreground">{detail}</p></div>;
}

function AuditRow({ log, locale, onOpen }: { log: AuditEntry; locale: "fr" | "en"; onOpen: () => void }) {
  return <li><button type="button" onClick={onOpen} className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 px-4 py-4 text-left transition hover:bg-[#FBFAF8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-terre sm:px-5"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-md ${riskStyle(log.risk)}`}><DomainGlyph domain={log.domain} /></span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="text-xs font-black text-charcoal sm:text-sm">{actionLabel(log.action, locale)}</p><RiskBadge risk={log.risk} locale={locale} /><Badge variant="outline" className="h-5 border-charcoal/10 text-[8px]">{domainLabel(log.domain || "system", locale)}</Badge></div><p className="mt-1 line-clamp-2 text-[11px] leading-4 text-muted-foreground">{log.reason || (locale === "fr" ? "Aucun motif complémentaire enregistré." : "No additional reason recorded.")}</p><p className="mt-2 truncate text-[9px] text-muted-foreground">{formatDateTime(log.createdAt, locale)} · {log.actor || (locale === "fr" ? "Système" : "System")} · {log.entityType}{log.entityId ? ` / ${log.entityId}` : ""}</p></div><div className="flex h-full flex-col items-end justify-between gap-2"><span className={`text-[9px] font-black tabular-nums ${(log.evidenceScore || 0) >= 75 ? "text-forest" : "text-terre"}`}>{log.evidenceScore || 0}%</span><div className="flex items-center gap-1 text-[9px] text-muted-foreground"><span>{log.changes?.length || 0} {locale === "fr" ? "chgt." : "changes"}</span><ChevronRight className="h-4 w-4" /></div></div></button></li>;
}

function DomainGlyph({ domain }: { domain?: AuditEntry["domain"] }) {
  const className = "h-4 w-4";
  if (domain === "access") return <UserRoundCog className={className} />;
  if (domain === "stock") return <Boxes className={className} />;
  if (domain === "catalog") return <PackageSearch className={className} />;
  if (domain === "fulfillment") return <ShoppingBag className={className} />;
  if (domain === "customers") return <UsersRound className={className} />;
  if (domain === "marketing") return <Megaphone className={className} />;
  if (domain === "finance") return <ReceiptText className={className} />;
  return <KeyRound className={className} />;
}

function AuditDetailDialog({ log, locale, onOpenChange }: { log: AuditEntry | null; locale: "fr" | "en"; onOpenChange: (open: boolean) => void }) {
  const isFr = locale === "fr";
  return <Dialog open={Boolean(log)} onOpenChange={onOpenChange}><DialogContent closeLabel={isFr ? "Fermer" : "Close"} className="flex max-h-[calc(100svh-1rem)] min-h-0 flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl"><DialogHeader className="shrink-0 border-b border-border px-5 py-5 pr-12 text-left sm:px-6"><div className="flex items-start gap-3"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-md ${riskStyle(log?.risk)}`}><Fingerprint className="h-4 w-4" /></span><div className="min-w-0"><p className="text-[9px] font-black uppercase text-terre">{isFr ? "Preuve d'activité" : "Activity evidence"}</p><DialogTitle className="mt-1">{log ? actionLabel(log.action, locale) : (isFr ? "Événement" : "Event")}</DialogTitle><DialogDescription className="mt-1">{log ? `${formatDateTime(log.createdAt, locale)} · ${log.entityType}` : ""}</DialogDescription></div></div></DialogHeader>{log ? <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6"><section className="grid grid-cols-2 overflow-hidden rounded-lg border border-charcoal/8 bg-white sm:grid-cols-4" aria-label={isFr ? "Qualification de la preuve" : "Evidence qualification"}><DetailMetric label={isFr ? "Risque" : "Risk"} value={riskLabel(log.risk || "routine", locale)} /><DetailMetric label={isFr ? "Domaine" : "Domain"} value={domainLabel(log.domain || "system", locale)} /><DetailMetric label={isFr ? "Complétude" : "Completeness"} value={`${log.evidenceScore || 0} %`} /><DetailMetric label={isFr ? "Modifications" : "Changes"} value={String(log.changes?.length || 0)} /></section><section><p className="text-[9px] font-black uppercase text-muted-foreground">{isFr ? "Contexte et responsabilité" : "Context and accountability"}</p><div className="mt-3 grid gap-3 border-y border-charcoal/8 py-4 text-xs sm:grid-cols-2"><EvidenceFact label={isFr ? "Acteur" : "Actor"} value={log.actor || (isFr ? "Système" : "System")} /><EvidenceFact label={isFr ? "Source d'identité" : "Identity source"} value={actorSourceLabel(log.actorSource, locale)} /><EvidenceFact label={isFr ? "Entité" : "Entity"} value={`${log.entityType} / ${log.entityId || "—"}`} /><EvidenceFact label={isFr ? "Contexte réseau" : "Network context"} value={log.ip || (isFr ? "Non enregistré" : "Not recorded")} /></div></section><section><p className="text-[9px] font-black uppercase text-muted-foreground">{isFr ? "Motif enregistré" : "Recorded reason"}</p><p className="mt-2 border-l-2 border-terre bg-terre/[0.035] px-3 py-3 text-xs leading-5 text-charcoal">{log.reason || (isFr ? "Aucun motif complémentaire enregistré." : "No additional reason recorded.")}</p></section><section aria-labelledby="audit-changes-title"><div className="flex items-end justify-between gap-3"><div><p className="text-[9px] font-black uppercase text-muted-foreground">{isFr ? "Différence structurée" : "Structured difference"}</p><h3 id="audit-changes-title" className="mt-1 text-sm font-black text-charcoal">{isFr ? "Avant et après" : "Before and after"}</h3></div><Badge variant="outline" className="border-charcoal/10 text-[9px]">ID {log.id}</Badge></div>{log.changes?.length ? <div className="mt-3 divide-y divide-border border-y border-border">{log.changes.map((change) => <div key={change.field} className="grid gap-2 py-3 sm:grid-cols-[9rem_1fr_1fr]"><div><p className="text-[10px] font-black text-charcoal">{fieldLabel(change.field)}</p><p className="mt-0.5 text-[8px] uppercase text-muted-foreground">{change.kind}</p></div><ChangeValue label={isFr ? "Avant" : "Before"} value={change.before} /><ChangeValue label={isFr ? "Après" : "After"} value={change.after} after /></div>)}</div> : <div className="mt-3 flex gap-3 border-y border-charcoal/8 bg-[#F8F7F4] p-4 text-xs leading-5 text-muted-foreground"><ScrollText className="mt-0.5 h-4 w-4 shrink-0" />{isFr ? "Cet événement ne contient pas de différence structurée exploitable." : "This event contains no usable structured difference."}</div>}</section></div> : null}</DialogContent></Dialog>;
}

function DetailMetric({ label, value }: { label: string; value: string }) { return <div className="min-w-0 border-b border-r border-charcoal/8 p-3 last:border-r-0 sm:border-b-0"><p className="truncate text-[8px] font-black uppercase text-muted-foreground">{label}</p><p className="mt-1 truncate text-xs font-black text-charcoal">{value}</p></div>; }
function EvidenceFact({ label, value }: { label: string; value: string }) { return <div className="min-w-0"><p className="text-[9px] font-black uppercase text-muted-foreground">{label}</p><p className="mt-1 break-words font-bold text-charcoal">{value}</p></div>; }
function ChangeValue({ label, value, after = false }: { label: string; value: string | null; after?: boolean }) { return <div className={`min-w-0 rounded-md px-3 py-2 ${after ? "bg-forest/[0.05]" : "bg-muted/60"}`}><p className="text-[8px] font-black uppercase text-muted-foreground">{label}</p><p className="mt-1 break-words text-[10px] leading-4 text-charcoal">{value ?? "—"}</p></div>; }

function FilterSelect({ label, value, onChange, options, optionLabel }: { label: string; value: string; onChange: (value: string) => void; options: readonly string[]; optionLabel: (value: string) => string }) { return <label className="block"><span className="sr-only">{label}</span><select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full rounded-md border border-input bg-white px-3 text-xs font-bold text-charcoal shadow-xs">{options.map((option) => <option key={option} value={option}>{optionLabel(option)}</option>)}</select></label>; }

function RiskBadge({ risk = "routine", locale }: { risk?: AuditEntry["risk"]; locale: "fr" | "en" }) { return <Badge variant="outline" className={`h-5 text-[8px] ${risk === "critical" ? "border-destructive/25 bg-destructive/[0.04] text-destructive" : risk === "attention" ? "border-gold/45 bg-gold/[0.08] text-charcoal" : "border-forest/20 bg-forest/[0.035] text-forest"}`}>{riskLabel(risk || "routine", locale)}</Badge>; }
function riskStyle(risk?: AuditEntry["risk"]) { return risk === "critical" ? "bg-destructive/10 text-destructive" : risk === "attention" ? "bg-gold/25 text-charcoal" : "bg-forest/10 text-forest"; }
function riskLabel(risk: RiskFilter, locale: "fr" | "en") { if (risk === "all") return locale === "fr" ? "Tous les risques" : "All risks"; if (risk === "critical") return locale === "fr" ? "Critique" : "Critical"; if (risk === "attention") return locale === "fr" ? "À vérifier" : "Review"; return locale === "fr" ? "Courant" : "Routine"; }
function domainLabel(domain: DomainFilter, locale: "fr" | "en") { const labels: Record<DomainFilter, [string, string]> = { all: ["Tous les domaines", "All domains"], access: ["Accès et équipe", "Access and team"], stock: ["Stocks et lots", "Stock and batches"], catalog: ["Catalogue et recettes", "Catalogue and recipes"], fulfillment: ["Commandes et livraison", "Orders and delivery"], customers: ["Relation client", "Customer relations"], marketing: ["Marketing et contenus", "Marketing and content"], finance: ["Finance", "Finance"], system: ["Système", "System"] }; return labels[domain][locale === "fr" ? 0 : 1]; }
function actorSourceLabel(source: AuditEntry["actorSource"], locale: "fr" | "en") { if (source === "identity") return locale === "fr" ? "Identité liée" : "Linked identity"; if (source === "reason") return locale === "fr" ? "Motif signé" : "Signed reason"; return locale === "fr" ? "Traitement système" : "System process"; }
function actionLabel(action: string, locale: "fr" | "en") { const labels: Record<string, [string, string]> = { price_change: ["Modification de prix", "Price change"], stock_change: ["Mouvement de stock", "Stock movement"], batch_create: ["Réception de lot", "Batch receipt"], stock_adjustment: ["Ajustement de lot", "Batch adjustment"], batch_status_change: ["Décision sanitaire", "Safety decision"], order_created: ["Création de commande", "Order created"], order_fulfillment_advance: ["Avancement de commande", "Order advancement"], order_logistics_update: ["Mise à jour logistique", "Logistics update"], recipe_create: ["Création de recette", "Recipe created"], recipe_change: ["Modification de recette", "Recipe change"], recipe_editorial_update: ["Mise à jour éditoriale de recette", "Recipe editorial update"], recipe_delete: ["Suppression de recette", "Recipe deletion"], product_create: ["Création de produit", "Product created"], product_created: ["Création de produit", "Product created"], product_editorial_update: ["Mise à jour éditoriale du produit", "Product editorial update"], product_delete: ["Suppression de produit", "Product deletion"], push_campaign_sent: ["Diffusion d'une campagne", "Campaign sent"], advertisement_create: ["Création publicitaire", "Advertisement created"], advertisement_update: ["Mise à jour publicitaire", "Advertisement updated"], advertisement_delete: ["Suppression publicitaire", "Advertisement deleted"], team_invite: ["Invitation d'un membre", "Team member invited"], team_member_update: ["Modification d'un accès", "Team access updated"], team_member_delete: ["Suppression d'un accès", "Team access deleted"], customer_note_update: ["Mise à jour de la relation client", "Customer relationship updated"], media_upload: ["Chargement d'un média", "Media uploaded"] }; return (labels[action] || [action.replaceAll("_", " "), action.replaceAll("_", " ")])[locale === "fr" ? 0 : 1]; }
function fieldLabel(field: string) { return field.replace(/([a-z])([A-Z])/g, "$1 $2").replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase()); }
function formatNumber(value: number, locale: "fr" | "en") { return value.toLocaleString(locale === "fr" ? "fr-FR" : "en-GB", { maximumFractionDigits: 1 }); }

function downloadAuditCsv(logs: AuditEntry[], locale: "fr" | "en") { const headings = locale === "fr" ? ["Date", "Risque", "Domaine", "Action", "Entité", "Identifiant", "Acteur", "Motif", "Adresse IP", "Complétude", "Modifications"] : ["Date", "Risk", "Domain", "Action", "Entity", "Identifier", "Actor", "Reason", "IP address", "Completeness", "Changes"]; const rows = logs.map((log) => [log.createdAt, riskLabel(log.risk || "routine", locale), domainLabel(log.domain || "system", locale), actionLabel(log.action, locale), log.entityType, log.entityId || "", log.actor || "", log.reason || "", log.ip || "", log.evidenceScore || 0, log.changes?.length || 0]); const csv = [headings, ...rows].map((row) => row.map(csvCell).join(";")).join("\n"); const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = "je-mange-africain-journal-audit.csv"; link.click(); URL.revokeObjectURL(url); }
function csvCell(value: string | number) { return `"${String(value).replaceAll('"', '""')}"`; }
