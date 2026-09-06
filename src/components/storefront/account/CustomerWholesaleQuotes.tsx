"use client";

import { useState } from "react";
import {
  ArrowRight,
  Boxes,
  BriefcaseBusiness,
  Check,
  CircleCheckBig,
  CircleX,
  Clock3,
  FileCheck2,
  FileClock,
  Mail,
  MapPin,
  PackageCheck,
  Phone,
  RefreshCw,
  SearchCheck,
  Truck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ProductImage } from "@/components/shared/ProductImage";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatPrice, thermalLabel } from "@/lib/format";
import { useStore } from "@/lib/store";

export type CustomerWholesaleQuoteStatus = "new" | "reviewing" | "quoted" | "accepted" | "declined" | "expired";

export type CustomerWholesaleQuote = {
  id: string;
  reference: string;
  status: CustomerWholesaleQuoteStatus;
  locale: "fr" | "en";
  company: string;
  contactName: string;
  email: string;
  phone: string;
  country: string;
  postalCode: string;
  deliveryRequirements: string;
  additionalNeeds?: string | null;
  estimatedSubtotal: number;
  totalPacks: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  items: Array<{
    id: string;
    productId: string;
    productNameFr: string;
    productNameEn: string;
    sku: string;
    imageUrl?: string | null;
    packLabel: string;
    packs: number;
    unitsPerPack: number;
    unitPrice: number;
    lineTotal: number;
    thermalClass: string;
  }>;
};

export type CustomerWholesaleQuotesResponse = {
  quotes: CustomerWholesaleQuote[];
  generatedAt: string;
};

type Props = {
  locale: "fr" | "en";
  data?: CustomerWholesaleQuotesResponse;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
};

export function CustomerWholesaleQuotes({ locale, data, loading, error, onRetry }: Props) {
  const navigate = useStore((state) => state.navigate);
  const [selected, setSelected] = useState<CustomerWholesaleQuote | null>(null);
  const quotes = data?.quotes || [];
  const activeCount = quotes.filter((quote) => ["new", "reviewing", "quoted"].includes(quote.status)).length;
  const acceptedCount = quotes.filter((quote) => quote.status === "accepted").length;
  const isFr = locale === "fr";

  return (
    <section aria-labelledby="customer-quotes-title" data-testid="customer-wholesale-quotes">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="jma-eyebrow">{isFr ? "Achats professionnels" : "Professional purchasing"}</p>
          <h2 id="customer-quotes-title" className="jma-section-title mt-1">{isFr ? "Mes devis professionnels" : "My professional quotes"}</h2>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground sm:text-sm">{isFr ? "Suivez chaque sélection de gros, l’étude logistique et la décision commerciale depuis un dossier unique." : "Track every wholesale selection, logistics review and commercial decision from one file."}</p>
        </div>
        <Button type="button" size="sm" onClick={() => navigate("wholesale")} className="h-9 shrink-0 bg-terre px-3 text-white hover:bg-terre-dark"><Boxes className="mr-1.5 h-4 w-4" /><span className="hidden sm:inline">{isFr ? "Nouveau devis" : "New quote"}</span><span className="sm:hidden">{isFr ? "Nouveau" : "New"}</span></Button>
      </div>

      <div className="mt-5 grid grid-cols-3 divide-x divide-burgundy/10 border-y border-burgundy/10 bg-[#FFFCFA]" aria-label={isFr ? "Synthèse des devis professionnels" : "Professional quote summary"}>
        <QuoteSummary icon={BriefcaseBusiness} label={isFr ? "Dossiers" : "Files"} value={quotes.length} />
        <QuoteSummary icon={FileClock} label={isFr ? "En cours" : "In progress"} value={activeCount} />
        <QuoteSummary icon={CircleCheckBig} label={isFr ? "Accords" : "Agreements"} value={acceptedCount} />
      </div>

      {loading ? <QuoteSkeleton /> : null}
      {!loading && error ? (
        <div className="mt-6 border-y border-border py-10 text-center" role="alert">
          <FileClock className="mx-auto h-9 w-9 text-terre/55" />
          <h3 className="mt-3 text-sm font-black text-charcoal">{isFr ? "Suivi momentanément indisponible" : "Tracking temporarily unavailable"}</h3>
          <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-muted-foreground">{isFr ? "Vos dossiers restent enregistrés. Rechargez leur état sans recréer de demande." : "Your files remain recorded. Reload their status without creating another request."}</p>
          <Button type="button" variant="outline" size="sm" onClick={onRetry} className="mt-4"><RefreshCw className="mr-1.5 h-4 w-4" />{isFr ? "Actualiser le suivi" : "Refresh tracking"}</Button>
        </div>
      ) : null}
      {!loading && !error && quotes.length === 0 ? (
        <div className="mt-6 border-y border-border py-10 text-center">
          <Boxes className="mx-auto h-9 w-9 text-terre/55" />
          <h3 className="mt-3 text-sm font-black text-charcoal">{isFr ? "Aucun devis professionnel" : "No professional quote yet"}</h3>
          <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-muted-foreground">{isFr ? "Composez une sélection par colis sur le marché de gros. Les volumes et le stock seront vérifiés avant proposition." : "Build a case-based selection in the wholesale market. Volumes and stock will be checked before an offer is made."}</p>
          <Button type="button" variant="outline" size="sm" onClick={() => navigate("wholesale")} className="mt-4 border-terre/25 text-terre"><ArrowRight className="mr-1.5 h-4 w-4" />{isFr ? "Ouvrir le marché de gros" : "Open wholesale market"}</Button>
        </div>
      ) : null}
      {!loading && !error && quotes.length ? (
        <div className="mt-5 grid gap-3 md:grid-cols-2" data-testid="customer-quote-list">
          {quotes.map((quote) => <QuoteCard key={quote.id} quote={quote} locale={locale} onOpen={() => setSelected(quote)} />)}
        </div>
      ) : null}

      <QuoteDetailsDialog quote={selected} locale={locale} onClose={() => setSelected(null)} />
    </section>
  );
}

function QuoteSummary({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number }) {
  return <div className="min-w-0 px-2 py-3 text-center sm:py-4"><Icon className="mx-auto h-4 w-4 text-terre" /><p className="mt-1 text-sm font-black tabular-nums text-charcoal">{value}</p><p className="truncate text-[8px] font-black uppercase text-muted-foreground sm:text-[9px]">{label}</p></div>;
}

function QuoteCard({ quote, locale, onOpen }: { quote: CustomerWholesaleQuote; locale: "fr" | "en"; onOpen: () => void }) {
  const isFr = locale === "fr";
  const status = quoteStatus(quote.status, locale);
  const name = quote.items[0] ? (isFr ? quote.items[0].productNameFr : quote.items[0].productNameEn) : quote.company;
  return (
    <article className="overflow-hidden rounded-md border border-border bg-white transition hover:border-burgundy/20 hover:shadow-[0_14px_32px_-28px_rgba(90,38,50,0.72)]">
      <button type="button" onClick={onOpen} className="w-full p-3 text-left sm:p-4" aria-label={isFr ? `Ouvrir le devis ${quote.reference}` : `Open quote ${quote.reference}`}>
        <div className="flex items-start gap-3">
          <QuoteImageStack quote={quote} locale={locale} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-[9px] font-black uppercase text-burgundy">{quote.reference}</span><StatusPill icon={status.icon} label={status.label} tone={status.tone} /></div>
            <h3 className="mt-1 truncate text-sm font-black text-charcoal">{quote.company}</h3>
            <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{name}{quote.items.length > 1 ? ` +${quote.items.length - 1}` : ""}</p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 divide-x divide-border border-t border-border pt-3 text-center">
          <QuoteFact label={isFr ? "Estimation" : "Estimate"} value={formatPrice(quote.estimatedSubtotal, locale)} />
          <QuoteFact label={isFr ? "Colis" : "Cases"} value={String(quote.totalPacks)} />
          <QuoteFact label={isFr ? "Mis à jour" : "Updated"} value={formatQuoteDate(quote.updatedAt, locale, true)} />
        </div>
      </button>
    </article>
  );
}

function QuoteImageStack({ quote, locale }: { quote: CustomerWholesaleQuote; locale: "fr" | "en" }) {
  const items = quote.items.slice(0, 2);
  if (!items.length) return <span className="grid h-12 w-12 shrink-0 place-items-center rounded-md bg-terre/10 text-terre"><Boxes className="h-5 w-5" /></span>;
  return <span className="relative h-12 w-14 shrink-0">{items.map((item, index) => <ProductImage key={item.id} src={item.imageUrl} alt={index === 0 ? (locale === "fr" ? item.productNameFr : item.productNameEn) : ""} emoji="" color="#FFF8F4" size="sm" className={`absolute top-0 h-12 w-12 border-2 border-white ${index === 0 ? "left-0 z-10" : "left-2.5"}`} rounded="rounded-md" />)}</span>;
}

function QuoteFact({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0 px-1"><p className="truncate text-[8px] font-black uppercase text-muted-foreground">{label}</p><p className="mt-1 truncate text-[10px] font-black text-charcoal sm:text-xs">{value}</p></div>;
}

function QuoteDetailsDialog({ quote, locale, onClose }: { quote: CustomerWholesaleQuote | null; locale: "fr" | "en"; onClose: () => void }) {
  const isFr = locale === "fr";
  if (!quote) return null;
  const status = quoteStatus(quote.status, locale);
  const StatusIcon = status.icon;
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="flex max-h-[calc(100svh-1rem)] flex-col overflow-hidden p-0 sm:max-w-2xl">
        <div className="border-b border-burgundy/10 bg-[#FFF8F4] px-5 pb-4 pt-5 sm:px-6">
          <DialogHeader className="pr-8 text-left">
            <span className="mb-1 grid h-10 w-10 place-items-center rounded-md bg-burgundy text-white"><StatusIcon className="h-5 w-5" /></span>
            <p className="text-[9px] font-black uppercase text-terre">{quote.reference}</p>
            <DialogTitle>{quote.company}</DialogTitle>
            <DialogDescription>{status.detail}</DialogDescription>
          </DialogHeader>
          <div className="mt-4 grid grid-cols-3 divide-x divide-burgundy/10 border-y border-burgundy/10 bg-white/70 py-2.5 text-center">
            <QuoteFact label={isFr ? "Estimation" : "Estimate"} value={formatPrice(quote.estimatedSubtotal, locale)} />
            <QuoteFact label={isFr ? "Produits" : "Products"} value={String(quote.items.length)} />
            <QuoteFact label={isFr ? "Colis" : "Cases"} value={String(quote.totalPacks)} />
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-x-hidden overflow-y-auto px-5 py-5 sm:px-6">
          <QuoteJourney status={quote.status} locale={locale} />

          <section aria-labelledby="quote-products-title">
            <h3 id="quote-products-title" className="text-xs font-black uppercase text-charcoal">{isFr ? "Sélection enregistrée" : "Recorded selection"}</h3>
            <div className="mt-2 divide-y divide-border border-y border-border">
              {quote.items.map((item) => {
                const name = isFr ? item.productNameFr : item.productNameEn;
                return <article key={item.id} className="grid grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-3 py-3"><ProductImage src={item.imageUrl} alt={name} emoji="" color="#FFF8F4" size="sm" className="h-12 w-12" rounded="rounded-md" /><div className="min-w-0"><p className="truncate text-xs font-black text-charcoal">{name}</p><p className="mt-0.5 truncate text-[9px] text-muted-foreground">{item.sku} · {item.packLabel}</p><p className="mt-1 text-[9px] font-bold text-terre">{thermalLabel(item.thermalClass, locale)} · {item.unitsPerPack} {isFr ? "unités/colis" : "units/case"}</p></div><div className="text-right"><p className="text-xs font-black text-charcoal">{item.packs} × {formatPrice(item.unitPrice, locale)}</p><p className="mt-1 text-[10px] font-bold text-burgundy">{formatPrice(item.lineTotal, locale)}</p></div></article>;
              })}
            </div>
          </section>

          <section aria-labelledby="quote-delivery-title">
            <h3 id="quote-delivery-title" className="text-xs font-black uppercase text-charcoal">{isFr ? "Contact et livraison" : "Contact and delivery"}</h3>
            <div className="mt-2 grid gap-x-5 gap-y-3 border-y border-border py-3 sm:grid-cols-2">
              <DetailLine icon={MapPin} label={isFr ? "Destination" : "Destination"} value={`${quote.postalCode}, ${quote.country}`} />
              <DetailLine icon={Mail} label="Email" value={quote.email} />
              <DetailLine icon={Phone} label={isFr ? "Téléphone" : "Phone"} value={quote.phone} />
              <DetailLine icon={Truck} label={isFr ? "Contraintes" : "Requirements"} value={quote.deliveryRequirements} />
              {quote.additionalNeeds ? <div className="sm:col-span-2"><DetailLine icon={PackageCheck} label={isFr ? "Besoin complémentaire" : "Additional requirement"} value={quote.additionalNeeds} /></div> : null}
            </div>
          </section>

          <p className="text-[10px] leading-4 text-muted-foreground">{isFr ? `Créé le ${formatQuoteDate(quote.createdAt, locale)} · dernière évolution le ${formatQuoteDate(quote.updatedAt, locale)}.` : `Created ${formatQuoteDate(quote.createdAt, locale)} · last updated ${formatQuoteDate(quote.updatedAt, locale)}.`}</p>
        </div>
        <DialogFooter className="shrink-0 border-t border-border bg-white px-5 py-3 sm:px-6 sm:py-4"><Button type="button" onClick={onClose} className="bg-burgundy text-white hover:bg-burgundy/90">{isFr ? "Fermer le dossier" : "Close file"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function QuoteJourney({ status, locale }: { status: CustomerWholesaleQuoteStatus; locale: "fr" | "en" }) {
  const isFr = locale === "fr";
  const terminal = status === "declined" || status === "expired";
  const steps: CustomerWholesaleQuoteStatus[] = terminal ? ["new", "reviewing", "quoted", status] : ["new", "reviewing", "quoted", "accepted"];
  const currentIndex = steps.indexOf(status);
  return (
    <section aria-labelledby="quote-journey-title" data-testid="customer-quote-journey">
      <div className="flex items-end justify-between gap-3"><div><p className="jma-eyebrow">{isFr ? "Progression" : "Progress"}</p><h3 id="quote-journey-title" className="mt-0.5 text-sm font-black text-charcoal">{isFr ? "Parcours du dossier" : "File journey"}</h3></div><StatusPill icon={quoteStatus(status, locale).icon} label={quoteStatus(status, locale).label} tone={quoteStatus(status, locale).tone} /></div>
      <ol className="mt-3 grid grid-cols-4" aria-label={isFr ? "Étapes du devis" : "Quote stages"}>
        {steps.map((step, index) => {
          const meta = quoteStatus(step, locale);
          const reached = index <= currentIndex;
          const Icon = meta.icon;
          return <li key={step} className="relative min-w-0 text-center"><span className={`absolute left-0 right-0 top-4 h-px ${reached ? "bg-burgundy/35" : "bg-border"}`} aria-hidden="true" /><span className={`relative mx-auto grid h-8 w-8 place-items-center rounded-full border ${index === currentIndex ? "border-burgundy bg-burgundy text-white" : reached ? "border-burgundy/25 bg-[#FFF8F4] text-burgundy" : "border-border bg-white text-muted-foreground"}`}>{reached && index < currentIndex ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}</span><p className={`mt-1.5 truncate px-1 text-[8px] font-black ${reached ? "text-charcoal" : "text-muted-foreground"}`}>{meta.shortLabel}</p></li>;
        })}
      </ol>
    </section>
  );
}

function DetailLine({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return <div className="flex min-w-0 items-start gap-2.5"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-terre/[0.08] text-terre"><Icon className="h-3.5 w-3.5" /></span><div className="min-w-0"><p className="text-[8px] font-black uppercase text-muted-foreground">{label}</p><p className="mt-0.5 break-words text-[10px] font-semibold leading-4 text-charcoal">{value}</p></div></div>;
}

function StatusPill({ icon: Icon, label, tone }: { icon: LucideIcon; label: string; tone: "burgundy" | "earth" | "gold" | "muted" }) {
  const classes = tone === "burgundy" ? "border-burgundy/20 bg-burgundy/[0.07] text-burgundy" : tone === "earth" ? "border-terre/20 bg-terre/[0.07] text-terre" : tone === "gold" ? "border-gold/30 bg-gold/[0.1] text-charcoal" : "border-border bg-muted text-muted-foreground";
  return <span className={`inline-flex max-w-full items-center gap-1 rounded-md border px-1.5 py-1 text-[8px] font-black uppercase ${classes}`}><Icon className="h-3 w-3 shrink-0" /><span className="truncate">{label}</span></span>;
}

function quoteStatus(status: CustomerWholesaleQuoteStatus, locale: "fr" | "en"): { label: string; shortLabel: string; detail: string; icon: LucideIcon; tone: "burgundy" | "earth" | "gold" | "muted" } {
  const isFr = locale === "fr";
  const statuses = {
    new: { label: isFr ? "Demande reçue" : "Request received", shortLabel: isFr ? "Reçu" : "Received", detail: isFr ? "Votre sélection est enregistrée et attend sa première vérification." : "Your selection is recorded and waiting for its first review.", icon: FileClock, tone: "earth" as const },
    reviewing: { label: isFr ? "Étude en cours" : "Under review", shortLabel: isFr ? "Étude" : "Review", detail: isFr ? "Les volumes, le stock et les contraintes de transport sont en cours de vérification." : "Volumes, stock and transport requirements are being checked.", icon: SearchCheck, tone: "gold" as const },
    quoted: { label: isFr ? "Proposition transmise" : "Offer sent", shortLabel: isFr ? "Proposition" : "Offer", detail: isFr ? "Les conditions finales ont été transmises aux coordonnées enregistrées dans le dossier." : "Final terms have been sent to the contact details recorded in the file.", icon: FileCheck2, tone: "burgundy" as const },
    accepted: { label: isFr ? "Accord confirmé" : "Agreement confirmed", shortLabel: isFr ? "Accord" : "Agreed", detail: isFr ? "Votre accord est enregistré. Le dossier peut maintenant être préparé pour la commande." : "Your agreement is recorded. The file can now be prepared for ordering.", icon: CircleCheckBig, tone: "burgundy" as const },
    declined: { label: isFr ? "Dossier clôturé" : "File closed", shortLabel: isFr ? "Clôturé" : "Closed", detail: isFr ? "Cette proposition a été clôturée. Une nouvelle sélection peut être créée à tout moment." : "This offer has been closed. A new selection can be created at any time.", icon: CircleX, tone: "muted" as const },
    expired: { label: isFr ? "Proposition expirée" : "Offer expired", shortLabel: isFr ? "Expiré" : "Expired", detail: isFr ? "La période de validité est terminée. Les prix et le stock doivent être recalculés dans un nouveau dossier." : "The validity period has ended. Prices and stock must be recalculated in a new file.", icon: Clock3, tone: "muted" as const },
  };
  return statuses[status];
}

function formatQuoteDate(value: string, locale: "fr" | "en", short = false) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", short ? { day: "2-digit", month: "short" } : { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function QuoteSkeleton() {
  return <div className="mt-5 grid gap-3 md:grid-cols-2" role="status" aria-label="Loading quotes">{Array.from({ length: 2 }).map((_, index) => <div key={index} className="h-36 animate-pulse rounded-md border border-border bg-muted/60" />)}</div>;
}
