"use client";

import { useMemo, useState, type FormEvent } from "react";
import { BadgeEuro, Boxes, Building2, CalendarClock, CheckCircle2, Clock3, Handshake, LoaderCircle, Mail, MapPin, Phone, Save, ShieldCheck } from "lucide-react";
import { AdminEmptyState, AdminErrorState, AdminPageHeader, AdminRefreshNotice, AdminSearchField, AdminSectionLoading, SectionTabs } from "@/components/admin/AdminPrimitives";
import type { AdminWholesaleQuote } from "@/components/admin/admin-types";
import { ProductImage } from "@/components/shared/ProductImage";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { europeanCountryLabel } from "@/lib/european-countries";
import { formatDateTime, formatPrice, normalize } from "@/lib/format";
import { useFetch } from "@/lib/use-fetch";
import { ADMIN_DATA_TTL_MS } from "@/lib/admin-prefetch";
import type { WholesaleQuoteStatus } from "@/lib/wholesale-quote";

type QuoteFilter = "all" | "new" | "active" | "closed";

export default function WholesaleQuotesSection({ locale, canUpdate }: { locale: "fr" | "en"; canUpdate: boolean }) {
  const isFr = locale === "fr";
  const request = useFetch<{ quotes: AdminWholesaleQuote[]; generatedAt: string }>(`/api/admin/wholesale-quotes?locale=${locale}`, [locale], {}, { cache: true, ttlMs: ADMIN_DATA_TTL_MS });
  const [filter, setFilter] = useState<QuoteFilter>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<AdminWholesaleQuote | null>(null);
  const quotes = request.data?.quotes || [];
  const metrics = useMemo(() => ({
    new: quotes.filter((quote) => quote.status === "new").length,
    active: quotes.filter((quote) => ["reviewing", "quoted"].includes(quote.status)).length,
    accepted: quotes.filter((quote) => quote.status === "accepted").length,
    pipeline: quotes.filter((quote) => !["declined", "expired"].includes(quote.status)).reduce((sum, quote) => sum + quote.estimatedSubtotal, 0),
  }), [quotes]);
  const filtered = useMemo(() => quotes.filter((quote) => {
    const matchesFilter = filter === "all"
      || quote.status === filter
      || (filter === "active" && ["reviewing", "quoted"].includes(quote.status))
      || (filter === "closed" && ["accepted", "declined", "expired"].includes(quote.status));
    return matchesFilter && normalize(`${quote.reference} ${quote.company} ${quote.contactName} ${quote.email} ${quote.country} ${quote.items.map((item) => `${item.productNameFr} ${item.productNameEn} ${item.sku}`).join(" ")}`).includes(normalize(query));
  }), [filter, query, quotes]);

  if (request.loading && !request.data) return <AdminSectionLoading label={isFr ? "Ouverture des devis de gros" : "Opening wholesale quotes"} />;
  if (request.error && !request.data) return <AdminErrorState locale={locale} message={request.error} onRetry={request.refetch} />;

  return (
    <div className="space-y-5">
      <AdminPageHeader
        variant="workspace"
        accent="#D65A32"
        icon={<Handshake className="h-5 w-5" />}
        eyebrow={isFr ? "Développement professionnel" : "Professional growth"}
        title={isFr ? "Qualifier les demandes de gros" : "Qualify wholesale requests"}
        description={isFr ? "Transformez chaque sélection client en dossier commercial traçable, du premier contact jusqu'à l'accord final." : "Turn each customer selection into a traceable commercial file, from first contact to final agreement."}
        signals={[
          { label: isFr ? "Nouveaux" : "New", value: String(metrics.new), icon: <Clock3 className="h-3.5 w-3.5" />, tone: "earth" },
          { label: isFr ? "Actifs" : "Active", value: String(metrics.active), icon: <Handshake className="h-3.5 w-3.5" />, tone: "burgundy" },
          { label: isFr ? "Pipeline" : "Pipeline", value: formatPrice(metrics.pipeline, locale), icon: <BadgeEuro className="h-3.5 w-3.5" />, tone: "gold" },
        ]}
      />

      {request.error && request.data ? <AdminRefreshNotice locale={locale} message={request.error} onRetry={request.refetch} /> : null}

      <section className="grid grid-cols-4 divide-x divide-charcoal/8 border-y border-charcoal/8 bg-white py-3 sm:py-4" aria-label={isFr ? "État des devis de gros" : "Wholesale quote health"} data-testid="wholesale-quote-metrics">
        <QuoteMetric icon={Clock3} value={String(metrics.new)} label={isFr ? "à prendre" : "new"} tone="terre" />
        <QuoteMetric icon={CalendarClock} value={String(metrics.active)} label={isFr ? "en cours" : "in progress"} tone="gold" />
        <QuoteMetric icon={CheckCircle2} value={String(metrics.accepted)} label={isFr ? "acceptés" : "accepted"} tone="burgundy" />
        <QuoteMetric icon={BadgeEuro} value={formatPrice(metrics.pipeline, locale)} label={isFr ? "pipeline estimé" : "estimated pipeline"} tone="soft" />
      </section>

      <div className="flex items-start gap-3 border-y border-burgundy/15 bg-burgundy/[0.04] px-4 py-3 text-xs leading-5 text-burgundy"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /><p><strong>{isFr ? "Prix figés" : "Frozen pricing"}</strong> · {isFr ? "Les paliers et montants enregistrés restent ceux vus lors de la demande, même si le catalogue évolue ensuite." : "Recorded tiers and amounts remain those shown at submission, even when the catalogue changes later."}</p></div>

      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <SectionTabs value={filter} onChange={setFilter} label={isFr ? "Avancement des devis" : "Quote progress"} items={[
          { value: "all", label: isFr ? "Tous" : "All", count: quotes.length },
          { value: "new", label: isFr ? "À prendre" : "New", count: metrics.new },
          { value: "active", label: isFr ? "En cours" : "In progress", count: metrics.active },
          { value: "closed", label: isFr ? "Clôturés" : "Closed", count: quotes.length - metrics.new - metrics.active },
        ]} />
        <AdminSearchField value={query} onChange={setQuery} label={isFr ? "Rechercher un devis de gros" : "Search wholesale quotes"} placeholder={isFr ? "Référence, entreprise ou produit" : "Reference, company or product"} resultCount={filtered.length} totalCount={quotes.length} locale={locale} className="w-full xl:w-80" />
      </div>

      {filtered.length ? (
        <section className="overflow-hidden rounded-lg border border-charcoal/8 bg-white" aria-label={isFr ? "Registre des devis de gros" : "Wholesale quote register"} data-testid="wholesale-quote-register">
          {filtered.map((quote) => <QuoteRow key={quote.id} quote={quote} locale={locale} onOpen={() => setSelected(quote)} />)}
        </section>
      ) : <AdminEmptyState icon={<Handshake className="h-5 w-5" />} title={quotes.length ? (isFr ? "Aucun dossier dans cette vue" : "No file in this view") : (isFr ? "Aucune demande de gros" : "No wholesale request")} description={quotes.length ? (isFr ? "Modifiez le filtre ou la recherche." : "Change the filter or search.") : (isFr ? "Les demandes structurées du marché de gros apparaîtront ici." : "Structured wholesale market requests will appear here.")} />}

      {selected ? <QuoteDetail key={`${selected.id}-${selected.updatedAt}`} quote={selected} locale={locale} canUpdate={canUpdate} onClose={() => setSelected(null)} onSaved={(quote) => { setSelected(quote); request.refetch(); }} /> : null}
    </div>
  );
}

function QuoteMetric({ icon: Icon, value, label, tone }: { icon: typeof Clock3; value: string; label: string; tone: "terre" | "gold" | "burgundy" | "soft" }) {
  const styles = { terre: "bg-terre/10 text-terre", gold: "bg-gold/20 text-charcoal", burgundy: "bg-burgundy/10 text-burgundy", soft: "bg-charcoal/5 text-charcoal" };
  return <div className="min-w-0 px-2 sm:flex sm:items-center sm:gap-3 sm:px-4"><span className={`hidden h-8 w-8 shrink-0 place-items-center rounded-md sm:grid ${styles[tone]}`}><Icon className="h-4 w-4" /></span><div className="min-w-0"><p className="truncate text-sm font-black tabular-nums text-charcoal sm:text-xl">{value}</p><p className="mt-0.5 truncate text-[8px] font-bold text-muted-foreground sm:text-[9px]">{label}</p></div></div>;
}

function QuoteRow({ quote, locale, onOpen }: { quote: AdminWholesaleQuote; locale: "fr" | "en"; onOpen: () => void }) {
  const isFr = locale === "fr";
  const firstItem = quote.items[0];
  return (
    <article className="border-b border-charcoal/8 last:border-b-0" data-testid={`wholesale-quote-${quote.id}`}>
      <button type="button" onClick={onOpen} className="grid w-full grid-cols-[3.25rem_minmax(0,1fr)_auto] items-center gap-3 p-3 text-left transition hover:bg-burgundy/[0.025] sm:grid-cols-[3.5rem_minmax(0,1.2fr)_minmax(8rem,.8fr)_auto] sm:p-4" aria-label={`${isFr ? "Ouvrir" : "Open"} ${quote.reference}`}>
        <ProductImage src={firstItem?.imageUrl} alt={firstItem ? (isFr ? firstItem.productNameFr : firstItem.productNameEn) : quote.company} emoji="" color="#D65A32" size="sm" className="h-13 w-13 sm:h-14 sm:w-14" rounded="rounded-md" />
        <span className="min-w-0"><span className="flex flex-wrap items-center gap-1.5"><strong className="truncate text-xs text-charcoal sm:text-sm">{quote.company}</strong><QuoteStatusBadge status={quote.status} locale={locale} /></span><span className="mt-1 block truncate text-[10px] font-bold text-burgundy">{quote.reference}</span><span className="mt-0.5 block truncate text-[9px] text-muted-foreground">{quote.contactName} · {europeanCountryLabel(quote.country, locale)}</span></span>
        <span className="hidden min-w-0 sm:block"><span className="block text-xs font-black tabular-nums text-terre">{formatPrice(quote.estimatedSubtotal, locale)}</span><span className="mt-1 block text-[9px] text-muted-foreground">{quote.totalPacks} {isFr ? "colis" : "cases"} · {quote.items.length} {isFr ? "référence(s)" : "item(s)"}</span></span>
        <span className="text-right"><strong className="block text-xs font-black tabular-nums text-terre sm:hidden">{formatPrice(quote.estimatedSubtotal, locale)}</strong><span className="mt-1 block text-[8px] text-muted-foreground">{formatDateTime(quote.createdAt, locale)}</span></span>
      </button>
    </article>
  );
}

function QuoteStatusBadge({ status, locale }: { status: WholesaleQuoteStatus; locale: "fr" | "en" }) {
  const labels: Record<WholesaleQuoteStatus, { fr: string; en: string }> = {
    new: { fr: "Nouveau", en: "New" }, reviewing: { fr: "À l'étude", en: "Reviewing" }, quoted: { fr: "Offre envoyée", en: "Quoted" }, accepted: { fr: "Accepté", en: "Accepted" }, declined: { fr: "Refusé", en: "Declined" }, expired: { fr: "Expiré", en: "Expired" },
  };
  const styles: Record<WholesaleQuoteStatus, string> = { new: "border-terre/25 bg-terre/[0.06] text-terre", reviewing: "border-gold/45 bg-gold/10 text-charcoal", quoted: "border-burgundy/25 bg-burgundy/[0.06] text-burgundy", accepted: "border-burgundy/30 bg-burgundy text-white", declined: "border-destructive/20 bg-destructive/[0.04] text-destructive", expired: "border-charcoal/15 bg-charcoal/[0.04] text-muted-foreground" };
  return <Badge variant="outline" className={`h-5 px-1.5 text-[8px] ${styles[status]}`}>{labels[status][locale]}</Badge>;
}

function QuoteDetail({ quote, locale, canUpdate, onClose, onSaved }: { quote: AdminWholesaleQuote; locale: "fr" | "en"; canUpdate: boolean; onClose: () => void; onSaved: (quote: AdminWholesaleQuote) => void }) {
  const isFr = locale === "fr";
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[calc(100svh-1rem)] overflow-y-auto p-0 sm:max-w-3xl">
        <DialogHeader className="border-b border-burgundy/10 px-5 py-5 sm:px-6"><div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-terre text-white"><Handshake className="h-5 w-5" /></span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><DialogTitle>{quote.company}</DialogTitle><QuoteStatusBadge status={quote.status} locale={locale} /></div><DialogDescription className="mt-1">{quote.reference} · {formatDateTime(quote.createdAt, locale)}</DialogDescription></div></div></DialogHeader>
        <div className="space-y-5 px-5 py-5 sm:px-6">
          <section className="grid gap-3 border-b border-charcoal/8 pb-5 sm:grid-cols-2" aria-label={isFr ? "Coordonnées commerciales" : "Commercial contact details"}>
            <ContactFact icon={Building2} label={isFr ? "Contact" : "Contact"} value={quote.contactName} />
            <ContactFact icon={MapPin} label={isFr ? "Livraison" : "Delivery"} value={`${quote.postalCode} · ${europeanCountryLabel(quote.country, locale)}`} />
            <ContactFact icon={Mail} label="Email" value={quote.email} href={`mailto:${quote.email}`} />
            <ContactFact icon={Phone} label={isFr ? "Téléphone" : "Phone"} value={quote.phone} href={`tel:${quote.phone}`} />
          </section>

          <section aria-labelledby="quote-lines-title"><div className="flex items-end justify-between gap-3"><div><p className="text-[9px] font-black uppercase text-burgundy">{isFr ? "Sélection figée" : "Frozen selection"}</p><h3 id="quote-lines-title" className="mt-0.5 text-sm font-black text-charcoal">{isFr ? "Produits à chiffrer" : "Products to quote"}</h3></div><p className="text-right text-base font-black text-terre">{formatPrice(quote.estimatedSubtotal, locale)}<span className="block text-[9px] text-muted-foreground">{quote.totalPacks} {isFr ? "colis" : "cases"}</span></p></div>
            {quote.items.length ? <div className="mt-3 divide-y divide-charcoal/8 border-y border-charcoal/8">{quote.items.map((item) => <div key={item.id} className="grid grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-3 py-3"><ProductImage src={item.imageUrl} alt={locale === "fr" ? item.productNameFr : item.productNameEn} emoji="" color="#D65A32" size="sm" className="h-12 w-12" rounded="rounded-md" /><div className="min-w-0"><p className="truncate text-xs font-black text-charcoal">{locale === "fr" ? item.productNameFr : item.productNameEn}</p><p className="mt-0.5 truncate text-[9px] text-muted-foreground">{item.sku} · {item.packLabel}</p><p className="mt-1 text-[9px] font-bold text-burgundy">{item.packs} × {formatPrice(item.unitPrice, locale)}</p></div><strong className="text-xs tabular-nums text-terre">{formatPrice(item.lineTotal, locale)}</strong></div>)}</div> : <p className="mt-3 border-y border-gold/30 bg-gold/[0.06] px-3 py-3 text-xs text-charcoal">{isFr ? "Demande libre sans produit présélectionné." : "Open request with no preselected product."}</p>}
          </section>

          <section className="grid gap-4 border-y border-charcoal/8 py-4 sm:grid-cols-2"><QuoteText label={isFr ? "Contraintes de livraison" : "Delivery requirements"} value={quote.deliveryRequirements} /><QuoteText label={isFr ? "Besoin complémentaire" : "Additional requirement"} value={quote.additionalNeeds || (isFr ? "Aucun" : "None")} /></section>
          {canUpdate ? <QuoteQualification quote={quote} locale={locale} onSaved={onSaved} /> : <p className="border-y border-gold/30 bg-gold/[0.06] px-4 py-3 text-xs text-charcoal">{isFr ? "Votre rôle permet la consultation, mais pas la qualification de ce dossier." : "Your role can view this file but cannot qualify it."}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ContactFact({ icon: Icon, label, value, href }: { icon: typeof Mail; label: string; value: string; href?: string }) {
  const content = <><span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-burgundy/[0.06] text-burgundy"><Icon className="h-3.5 w-3.5" /></span><span className="min-w-0"><span className="block text-[8px] font-black uppercase text-muted-foreground">{label}</span><strong className="mt-0.5 block truncate text-[11px] text-charcoal">{value}</strong></span></>;
  return href ? <a href={href} className="flex min-w-0 items-center gap-2.5 hover:text-burgundy">{content}</a> : <div className="flex min-w-0 items-center gap-2.5">{content}</div>;
}

function QuoteText({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[8px] font-black uppercase text-burgundy">{label}</p><p className="mt-1 whitespace-pre-wrap text-[11px] leading-5 text-charcoal">{value}</p></div>;
}

function QuoteQualification({ quote, locale, onSaved }: { quote: AdminWholesaleQuote; locale: "fr" | "en"; onSaved: (quote: AdminWholesaleQuote) => void }) {
  const isFr = locale === "fr";
  const [status, setStatus] = useState<WholesaleQuoteStatus>(quote.status);
  const [adminNote, setAdminNote] = useState(quote.adminNote || "");
  const [assignedTo, setAssignedTo] = useState(quote.assignedTo || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmStatus, setConfirmStatus] = useState<WholesaleQuoteStatus | null>(null);
  const options = transitionOptions(quote.status);
  const dirty = status !== quote.status || adminNote !== (quote.adminNote || "") || assignedTo !== (quote.assignedTo || "");

  const persist = async () => {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/admin/wholesale-quotes/${quote.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ locale, status, adminNote, assignedTo }) });
      const payload = await response.json() as { error?: string; quote?: AdminWholesaleQuote };
      if (!response.ok || !payload.quote) throw new Error(payload.error || (isFr ? "Mise à jour impossible." : "Unable to update."));
      setConfirmStatus(null); onSaved(payload.quote);
    } catch (cause) { setError(cause instanceof Error ? cause.message : (isFr ? "Mise à jour impossible." : "Unable to update.")); }
    finally { setBusy(false); }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (["accepted", "declined"].includes(status) && status !== quote.status) setConfirmStatus(status);
    else void persist();
  };

  return (
    <form onSubmit={submit} className="space-y-4" aria-label={isFr ? "Qualification du devis" : "Quote qualification"}>
      <div className="flex items-center gap-2"><Boxes className="h-4 w-4 text-terre" /><h3 className="text-sm font-black text-charcoal">{isFr ? "Qualification commerciale" : "Commercial qualification"}</h3></div>
      <div className="grid gap-3 sm:grid-cols-2"><div><Label htmlFor="quote-status" className="mb-1.5 block text-xs font-bold">{isFr ? "Étape" : "Stage"}</Label><select id="quote-status" value={status} onChange={(event) => setStatus(event.target.value as WholesaleQuoteStatus)} className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm text-charcoal">{options.map((option) => <option key={option} value={option}>{statusLabel(option, locale)}</option>)}</select></div><div><Label htmlFor="quote-owner" className="mb-1.5 block text-xs font-bold">{isFr ? "Responsable" : "Owner"}</Label><Input id="quote-owner" value={assignedTo} onChange={(event) => setAssignedTo(event.target.value)} placeholder={isFr ? "Nom ou équipe" : "Name or team"} /></div></div>
      <div><Label htmlFor="quote-admin-note" className="mb-1.5 block text-xs font-bold">{isFr ? "Note interne" : "Internal note"}</Label><Textarea id="quote-admin-note" value={adminNote} onChange={(event) => setAdminNote(event.target.value)} rows={4} maxLength={4000} placeholder={isFr ? "Volumes confirmés, transport, conditions négociées..." : "Confirmed volumes, transport, negotiated terms..."} /></div>
      {error ? <p role="alert" className="text-xs font-semibold text-destructive">{error}</p> : null}
      <DialogFooter><Button type="submit" disabled={!dirty || busy} className="bg-terre text-white hover:bg-terre-dark">{busy ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}{isFr ? "Enregistrer la qualification" : "Save qualification"}</Button></DialogFooter>
      <AlertDialog open={Boolean(confirmStatus)} onOpenChange={(open) => !open && !busy && setConfirmStatus(null)}><AlertDialogContent><AlertDialogHeader><span className="mb-1 grid h-11 w-11 place-items-center rounded-md bg-terre/10 text-terre"><Handshake className="h-5 w-5" /></span><AlertDialogTitle>{confirmStatus === "accepted" ? (isFr ? "Confirmer l'accord commercial ?" : "Confirm the commercial agreement?") : (isFr ? "Refuser définitivement cette demande ?" : "Decline this request?")}</AlertDialogTitle><AlertDialogDescription>{confirmStatus === "accepted" ? (isFr ? `Le dossier ${quote.reference} sera marqué accepté. L'équipe pourra engager la préparation contractuelle et logistique sur cette base.` : `${quote.reference} will be marked accepted. The team can begin contractual and logistics preparation on this basis.`) : (isFr ? `Le dossier ${quote.reference} sortira du pipeline actif. La sélection, les coordonnées et les notes resteront conservées dans l'historique.` : `${quote.reference} will leave the active pipeline. Its selection, contact details and notes will remain in history.`)}</AlertDialogDescription></AlertDialogHeader>{error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}<AlertDialogFooter><AlertDialogCancel>{isFr ? "Revenir au dossier" : "Return to file"}</AlertDialogCancel><AlertDialogAction onClick={() => void persist()} disabled={busy} className={confirmStatus === "declined" ? "bg-destructive text-white hover:bg-destructive/90" : "bg-terre text-white hover:bg-terre-dark"}>{busy ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Handshake className="mr-2 h-4 w-4" />}{confirmStatus === "accepted" ? (isFr ? "Oui, confirmer l'accord" : "Yes, confirm agreement") : (isFr ? "Oui, refuser" : "Yes, decline")}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </form>
  );
}

function transitionOptions(status: WholesaleQuoteStatus): WholesaleQuoteStatus[] {
  const transitions: Record<WholesaleQuoteStatus, WholesaleQuoteStatus[]> = { new: ["new", "reviewing", "declined"], reviewing: ["reviewing", "quoted", "declined"], quoted: ["quoted", "accepted", "declined", "expired"], accepted: ["accepted"], declined: ["declined", "reviewing"], expired: ["expired", "reviewing"] };
  return transitions[status];
}

function statusLabel(status: WholesaleQuoteStatus, locale: "fr" | "en") {
  const labels: Record<WholesaleQuoteStatus, { fr: string; en: string }> = { new: { fr: "Nouveau", en: "New" }, reviewing: { fr: "À l'étude", en: "Reviewing" }, quoted: { fr: "Offre envoyée", en: "Quoted" }, accepted: { fr: "Accepté", en: "Accepted" }, declined: { fr: "Refusé", en: "Declined" }, expired: { fr: "Expiré", en: "Expired" } };
  return labels[status][locale];
}
