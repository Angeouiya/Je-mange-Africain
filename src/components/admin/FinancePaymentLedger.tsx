"use client";

import { useDeferredValue, useState } from "react";
import { AlertCircle, ArrowRight, CalendarClock, CheckCircle2, ChevronLeft, ChevronRight, CircleDollarSign, Clock3, CreditCard, Download, Globe2, Landmark, LoaderCircle, ReceiptText, RotateCcw, ShieldCheck, Smartphone, WalletCards } from "lucide-react";
import { AdminEmptyState, AdminErrorState, AdminSearchField, AdminSectionLoading, SectionTabs } from "@/components/admin/AdminPrimitives";
import { PaymentRefundDialog } from "@/components/admin/PaymentRefundDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime, formatPrice } from "@/lib/format";
import { paymentMethodFamily, paymentMethodFamilyLabel, paymentMethodLabel, paymentStatusLabel, type PaymentMethodSummary } from "@/lib/payment-methods";
import { refundAmounts } from "@/lib/admin-refunds";
import { useFetch } from "@/lib/use-fetch";

type PaymentFilter = "all" | "captured" | "pending" | "refunds" | "exceptions";
type PaymentPeriod = "7d" | "30d" | "90d" | "all";
type PaymentRefund = { id: string; amount: number; status: string; reason?: string; createdAt: string };
type PaymentRow = {
  id: string;
  orderId: string;
  orderNumber: string;
  orderStatus: string;
  date: string;
  customer: string;
  country?: string | null;
  currency: string;
  method: string;
  status: string;
  amount: number;
  reference?: string | null;
  refunds: PaymentRefund[];
};

type PaymentLedgerResponse = {
  rows: PaymentRow[];
  summary: {
    netCapturedAmount: number;
    grossCapturedAmount: number;
    capturedCount: number;
    pendingAmount: number;
    pendingCount: number;
    refundedAmount: number;
    refundCount: number;
    pendingRefundAmount: number;
    exceptionAmount: number;
    exceptionCount: number;
    reconciliationRate: number;
  };
  counts: Record<PaymentFilter, number>;
  methods: PaymentMethodSummary[];
  coverage: { countries: string[]; currencies: string[]; familyCount: number };
  pagination: { page: number; pageSize: number; pageCount: number; totalRows: number; hasPrevious: boolean; hasNext: boolean };
  period: PaymentPeriod;
};

const EMPTY_ROWS: PaymentRow[] = [];
const EMPTY_METHODS: PaymentMethodSummary[] = [];
const EMPTY_COUNTS: Record<PaymentFilter, number> = { all: 0, captured: 0, pending: 0, refunds: 0, exceptions: 0 };
const EMPTY_SUMMARY: PaymentLedgerResponse["summary"] = { netCapturedAmount: 0, grossCapturedAmount: 0, capturedCount: 0, pendingAmount: 0, pendingCount: 0, refundedAmount: 0, refundCount: 0, pendingRefundAmount: 0, exceptionAmount: 0, exceptionCount: 0, reconciliationRate: 0 };
const EMPTY_COVERAGE: PaymentLedgerResponse["coverage"] = { countries: [], currencies: [], familyCount: 0 };
const EMPTY_PAGINATION: PaymentLedgerResponse["pagination"] = { page: 1, pageSize: 24, pageCount: 1, totalRows: 0, hasPrevious: false, hasNext: false };

export function FinancePaymentLedger({ locale, canUpdate, onNavigate }: { locale: "fr" | "en"; canUpdate: boolean; onNavigate?: (destination: "orders") => void }) {
  const isFr = locale === "fr";
  const [filter, setFilter] = useState<PaymentFilter>("all");
  const [period, setPeriod] = useState<PaymentPeriod>("30d");
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim());
  const endpoint = `/api/admin/payments?locale=${locale}&period=${period}&filter=${filter}&query=${encodeURIComponent(deferredQuery)}&page=${page}&pageSize=24`;
  const request = useFetch<PaymentLedgerResponse>(endpoint, [locale, period, filter, deferredQuery, page]);
  const payments = request.data?.rows ?? EMPTY_ROWS;
  const summary = request.data?.summary ?? EMPTY_SUMMARY;
  const counts = request.data?.counts ?? EMPTY_COUNTS;
  const paymentMix = request.data?.methods ?? EMPTY_METHODS;
  const coverage = request.data?.coverage ?? EMPTY_COVERAGE;
  const pagination = request.data?.pagination ?? EMPTY_PAGINATION;

  const changeFilter = (value: PaymentFilter) => { setFilter(value); setPage(1); };
  const changePeriod = (value: PaymentPeriod) => { setPeriod(value); setPage(1); };
  const changeQuery = (value: string) => { setQuery(value); setPage(1); };

  if (request.loading && !request.data) return <AdminSectionLoading label={isFr ? "Rapprochement des encaissements" : "Reconciling payments"} />;
  if (request.error && !request.data) return <AdminErrorState message={request.error} onRetry={request.refetch} />;

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-3 border-y border-charcoal/8 bg-[#F8F7F4] px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4" aria-label={isFr ? "Période du registre financier" : "Financial ledger period"} data-testid="payment-ledger-period">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-burgundy/[0.08] text-burgundy"><CalendarClock className="h-4 w-4" /></span>
          <div><p className="text-[9px] font-black uppercase text-terre">{isFr ? "Périmètre d’analyse" : "Analysis scope"}</p><h2 className="mt-0.5 text-xs font-black text-charcoal">{isFr ? "Paiements initiés sur la période" : "Payments initiated in the period"}</h2><p className="mt-0.5 text-[9px] leading-4 text-muted-foreground">{isFr ? "Les indicateurs, méthodes et remboursements restent rattachés à cette cohorte." : "Metrics, methods and refunds remain tied to this cohort."}</p></div>
        </div>
        <div className="flex min-w-0 items-start gap-2 sm:items-center">
          {request.loading && request.data ? <LoaderCircle className="mt-2 h-4 w-4 shrink-0 animate-spin text-terre" aria-label={isFr ? "Actualisation" : "Refreshing"} /> : null}
          <SectionTabs value={period} onChange={changePeriod} label={isFr ? "Période des paiements" : "Payment period"} items={[
            { value: "7d", label: isFr ? "7 jours" : "7 days" },
            { value: "30d", label: isFr ? "30 jours" : "30 days" },
            { value: "90d", label: isFr ? "90 jours" : "90 days" },
            { value: "all", label: isFr ? "Historique" : "All time" },
          ]} />
        </div>
      </section>

      <section className="grid grid-cols-2 overflow-hidden rounded-lg border border-charcoal/8 bg-white xl:grid-cols-4" aria-label={isFr ? "Santé des encaissements" : "Payment health"}>
        <PaymentMetric position={0} icon={CircleDollarSign} label={isFr ? "Net encaissé" : "Net collected"} value={formatPrice(summary.netCapturedAmount, locale)} detail={`${paymentCountLabel(summary.capturedCount, locale)} · ${formatNumber(summary.reconciliationRate, locale)} % ${isFr ? "rapprochés" : "reconciled"}`} tone="earth" />
        <PaymentMetric position={1} icon={Clock3} label={isFr ? "À finaliser" : "To complete"} value={formatPrice(summary.pendingAmount, locale)} detail={`${summary.pendingCount} ${isFr ? "en attente" : "pending"}`} tone="gold" />
        <PaymentMetric position={2} icon={RotateCcw} label={isFr ? "Remboursé" : "Refunded"} value={formatPrice(summary.refundedAmount, locale)} detail={`${summary.refundCount} ${isFr ? "décision(s) tracée(s)" : "audited decision(s)"}${summary.pendingRefundAmount > 0 ? ` · ${formatPrice(summary.pendingRefundAmount, locale)} ${isFr ? "en cours" : "pending"}` : ""}`} tone="burgundy" />
        <PaymentMetric position={3} icon={AlertCircle} label={isFr ? "Incidents" : "Issues"} value={formatPrice(summary.exceptionAmount, locale)} detail={`${summary.exceptionCount} ${isFr ? "à examiner" : "to review"}`} tone={summary.exceptionCount ? "alert" : "burgundy"} />
      </section>

      <PaymentMethodMix methods={paymentMix} locale={locale} />

      <PaymentCoverage coverage={coverage} locale={locale} />

      <div className="flex flex-col gap-3 border-y border-burgundy/15 bg-burgundy/[0.045] px-4 py-3 text-xs leading-5 text-burgundy sm:flex-row sm:items-center">
        <div className="flex min-w-0 items-start gap-3"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /><p><strong>{isFr ? "Registre contrôlé" : "Controlled ledger"}</strong> · {isFr ? "Chaque remboursement est plafonné au solde capturé, confirmé par le prestataire, attribué à son auteur et répercuté dans la rentabilité." : "Every refund is capped to the captured balance, confirmed by the provider, attributed to its author and reflected in profitability."}</p></div>
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-burgundy/15 pt-2 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0"><span className="text-[9px] font-black uppercase">{isFr ? "Taux rapproché" : "Reconciliation rate"}</span><strong className="text-sm font-black tabular-nums text-terre">{formatNumber(summary.reconciliationRate, locale)} %</strong></div>
      </div>

      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <SectionTabs value={filter} onChange={changeFilter} label={isFr ? "Statuts financiers" : "Financial statuses"} items={[
          { value: "all", label: isFr ? "Tous" : "All", count: counts.all },
          { value: "captured", label: isFr ? "Capturés" : "Captured", count: counts.captured },
          { value: "pending", label: isFr ? "En attente" : "Pending", count: counts.pending },
          { value: "refunds", label: isFr ? "Remboursements" : "Refunds", count: counts.refunds },
          { value: "exceptions", label: isFr ? "Exceptions" : "Exceptions", count: counts.exceptions },
        ]} />
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
          <AdminSearchField value={query} onChange={changeQuery} label={isFr ? "Rechercher un encaissement" : "Search payments"} placeholder={isFr ? "N°, client ou pays" : "Order, client or country"} resultCount={pagination.totalRows} totalCount={counts[filter]} locale={locale} className="w-full sm:w-80" />
          <Button type="button" variant="outline" size="sm" onClick={() => downloadPaymentsCsv(payments, locale)} disabled={!payments.length} className="h-10 shrink-0 border-charcoal/12"><Download className="mr-1.5 h-4 w-4" />{isFr ? "Exporter la page" : "Export page"}</Button>
        </div>
      </div>

      {payments.length ? <section className="overflow-hidden rounded-lg border border-charcoal/8 bg-white" aria-label={isFr ? "Registre des encaissements" : "Payment ledger"} aria-busy={request.loading}>
        <div className="hidden overflow-x-auto md:block"><Table><TableHeader><TableRow><TableHead>{isFr ? "Référence" : "Reference"}</TableHead><TableHead>{isFr ? "Commande et client" : "Order and customer"}</TableHead><TableHead>{isFr ? "Méthode" : "Method"}</TableHead><TableHead>{isFr ? "Statut" : "Status"}</TableHead><TableHead>{isFr ? "Horodatage" : "Timestamp"}</TableHead><TableHead className="text-right">{isFr ? "Montant" : "Amount"}</TableHead><TableHead><span className="sr-only">{isFr ? "Actions" : "Actions"}</span></TableHead></TableRow></TableHeader><TableBody>{payments.map((payment) => { const refundPosition = refundAmounts(payment.amount, payment.refunds); return <TableRow key={payment.id}><TableCell><div className="flex items-center gap-2"><ReceiptText className="h-4 w-4 text-terre" /><span className="text-xs font-bold text-charcoal">{payment.reference || "—"}</span></div>{refundPosition.committed > 0 ? <p className="mt-1 text-[9px] font-bold text-burgundy">{formatPrice(refundPosition.committed, locale)} {isFr ? "remboursés ou engagés" : "refunded or pending"}</p> : null}</TableCell><TableCell><p className="text-xs font-extrabold text-terre">{payment.orderNumber}</p><p className="mt-0.5 text-[10px] text-muted-foreground">{payment.customer}{payment.country ? ` · ${payment.country}` : ""}</p></TableCell><TableCell><PaymentMethodIdentity method={payment.method} locale={locale} /></TableCell><TableCell><PaymentStatusBadge status={payment.status} locale={locale} /></TableCell><TableCell className="text-[10px] text-muted-foreground">{formatDateTime(payment.date, locale)}</TableCell><TableCell className="text-right text-sm font-black tabular-nums">{formatPrice(payment.amount, locale)}</TableCell><TableCell className="text-right"><div className="flex justify-end gap-1"><PaymentRefundDialog payment={payment} order={{ id: payment.orderId, number: payment.orderNumber, customer: payment.customer, status: payment.orderStatus }} refunds={payment.refunds} locale={locale} canUpdate={canUpdate} onCompleted={request.refetch} />{onNavigate ? <Button type="button" variant="ghost" size="icon" onClick={() => onNavigate("orders")} title={isFr ? "Ouvrir les commandes" : "Open orders"} aria-label={`${isFr ? "Ouvrir la commande" : "Open order"} ${payment.orderNumber}`} className="h-8 w-8 text-muted-foreground hover:text-terre"><ArrowRight className="h-4 w-4" /></Button> : null}</div></TableCell></TableRow>; })}</TableBody></Table></div>
        <div className="divide-y divide-border md:hidden">{payments.map((payment) => { const refundPosition = refundAmounts(payment.amount, payment.refunds); return <article key={payment.id} className="p-4"><div className="flex items-start gap-3"><PaymentMethodIcon method={payment.method} className="h-10 w-10" /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-xs font-black text-charcoal">{payment.reference || payment.orderNumber}</p><p className="mt-0.5 truncate text-[10px] text-muted-foreground">{payment.orderNumber} · {payment.customer}{payment.country ? ` · ${payment.country}` : ""}</p></div><PaymentStatusBadge status={payment.status} locale={locale} /></div></div></div><div className="mt-3 grid grid-cols-3 border-y border-charcoal/8 py-3 text-[9px]"><div><span className="text-muted-foreground">{isFr ? "Montant" : "Amount"}</span><strong className="mt-1 block text-xs tabular-nums">{formatPrice(payment.amount, locale)}</strong>{refundPosition.committed > 0 ? <span className="mt-0.5 block text-[9px] font-bold text-burgundy">-{formatPrice(refundPosition.committed, locale)}</span> : null}</div><div className="min-w-0"><span className="text-muted-foreground">{isFr ? "Méthode" : "Method"}</span><strong className="mt-1 block truncate text-xs">{paymentMethodLabel(payment.method, locale)}</strong><span className="mt-0.5 block truncate text-[9px] text-muted-foreground">{paymentMethodFamilyLabel(payment.method, locale)}</span></div><div className="text-right"><span className="text-muted-foreground">{isFr ? "Reçu" : "Received"}</span><strong className="mt-1 block text-[10px]">{formatDateTime(payment.date, locale)}</strong></div></div><div className="mt-2 flex gap-2"><PaymentRefundDialog compact payment={payment} order={{ id: payment.orderId, number: payment.orderNumber, customer: payment.customer, status: payment.orderStatus }} refunds={payment.refunds} locale={locale} canUpdate={canUpdate} onCompleted={request.refetch} />{onNavigate ? <Button type="button" variant="ghost" size="sm" onClick={() => onNavigate("orders")} className="h-9 flex-1 justify-between px-2 text-[10px] font-black text-terre hover:bg-transparent hover:text-terre-dark">{isFr ? "Examiner" : "Review"}<ArrowRight className="h-3.5 w-3.5" /></Button> : null}</div></article>; })}</div>
      </section> : <AdminEmptyState icon={<ReceiptText className="h-5 w-5" />} title={isFr ? "Aucun mouvement financier" : "No financial movements"} description={isFr ? "Aucun paiement ne correspond à la période, au statut et à la recherche sélectionnés." : "No payment matches the selected period, status and search."} />}

      {pagination.totalRows > 0 ? <PaymentPagination pagination={pagination} locale={locale} onPrevious={() => setPage((current) => Math.max(1, current - 1))} onNext={() => setPage((current) => Math.min(pagination.pageCount, current + 1))} /> : null}
    </div>
  );
}

function PaymentCoverage({ coverage, locale }: { coverage: PaymentLedgerResponse["coverage"]; locale: "fr" | "en" }) {
  const isFr = locale === "fr";
  const visibleCountries = coverage.countries.slice(0, 4);
  return (
    <section className="flex flex-col gap-3 border-y border-charcoal/8 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between" aria-label={isFr ? "Couverture internationale observée" : "Observed international coverage"} data-testid="payment-market-coverage">
      <div className="flex min-w-0 items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-terre/[0.08] text-terre"><Globe2 className="h-4 w-4" /></span><div><p className="text-[9px] font-black uppercase text-terre">{isFr ? "Couverture réellement observée" : "Observed coverage"}</p><p className="mt-0.5 text-[10px] leading-4 text-muted-foreground">{isFr ? `${coverage.countries.length} pays livré${coverage.countries.length === 1 ? "" : "s"}, ${coverage.familyCount} famille${coverage.familyCount === 1 ? "" : "s"} de paiement et ${coverage.currencies.length} devise${coverage.currencies.length === 1 ? "" : "s"}.` : `${coverage.countries.length} delivery countr${coverage.countries.length === 1 ? "y" : "ies"}, ${coverage.familyCount} payment famil${coverage.familyCount === 1 ? "y" : "ies"} and ${coverage.currencies.length} currenc${coverage.currencies.length === 1 ? "y" : "ies"}.`}</p></div></div>
      <div className="flex min-w-0 flex-wrap gap-1.5 sm:justify-end">
        {visibleCountries.map((country) => <span key={country} className="rounded-md border border-charcoal/8 bg-[#F8F7F4] px-2 py-1 text-[9px] font-bold text-charcoal">{country}</span>)}
        {coverage.countries.length > visibleCountries.length ? <span className="rounded-md border border-burgundy/15 bg-burgundy/[0.045] px-2 py-1 text-[9px] font-black text-burgundy">+{coverage.countries.length - visibleCountries.length}</span> : null}
        {coverage.currencies.map((currency) => <span key={currency} className="rounded-md bg-gold/15 px-2 py-1 text-[9px] font-black text-charcoal">{currency}</span>)}
      </div>
    </section>
  );
}

function PaymentPagination({ pagination, locale, onPrevious, onNext }: { pagination: PaymentLedgerResponse["pagination"]; locale: "fr" | "en"; onPrevious: () => void; onNext: () => void }) {
  const isFr = locale === "fr";
  const first = (pagination.page - 1) * pagination.pageSize + 1;
  const last = Math.min(pagination.totalRows, pagination.page * pagination.pageSize);
  return (
    <nav className="flex items-center justify-between gap-3 border-t border-charcoal/8 pt-3" aria-label={isFr ? "Pagination du registre financier" : "Financial ledger pagination"} data-testid="payment-pagination">
      <p className="min-w-0 text-[10px] text-muted-foreground"><strong className="font-black text-charcoal">{first}-{last}</strong> {isFr ? "sur" : "of"} <strong className="font-black text-charcoal">{pagination.totalRows}</strong><span className="hidden sm:inline"> · {isFr ? "page" : "page"} {pagination.page}/{pagination.pageCount}</span></p>
      <div className="flex shrink-0 gap-1.5">
        <Button type="button" variant="outline" size="icon" onClick={onPrevious} disabled={!pagination.hasPrevious} className="h-9 w-9" aria-label={isFr ? "Page précédente" : "Previous page"}><ChevronLeft className="h-4 w-4" /></Button>
        <Button type="button" variant="outline" size="icon" onClick={onNext} disabled={!pagination.hasNext} className="h-9 w-9" aria-label={isFr ? "Page suivante" : "Next page"}><ChevronRight className="h-4 w-4" /></Button>
      </div>
    </nav>
  );
}

function PaymentMethodMix({ methods, locale }: { methods: PaymentMethodSummary[]; locale: "fr" | "en" }) {
  const isFr = locale === "fr";
  if (!methods.length) return null;

  return (
    <section className="overflow-hidden rounded-lg border border-charcoal/8 bg-white" aria-labelledby="payment-method-mix-title" data-testid="payment-method-mix">
      <div className="flex items-start justify-between gap-4 border-b border-charcoal/8 px-4 py-3.5 sm:px-5">
        <div><p className="text-[9px] font-black uppercase text-terre">{isFr ? "Adoption des moyens" : "Method adoption"}</p><h2 id="payment-method-mix-title" className="mt-1 text-sm font-black text-charcoal">{isFr ? "Comment les clients choisissent de payer" : "How customers choose to pay"}</h2></div>
        <span className="rounded bg-gold/15 px-2 py-1 text-[9px] font-black text-charcoal">{methods.length} {isFr ? "méthodes" : "methods"}</span>
      </div>
      <div className="grid divide-y divide-charcoal/8 sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-3">
        {methods.slice(0, 6).map((method, index) => (
          <div key={method.method} className={`min-w-0 px-4 py-3.5 sm:px-5 ${index >= 2 ? "sm:border-t sm:border-charcoal/8 xl:border-t-0" : ""}`}>
            <div className="flex items-center gap-3">
              <PaymentMethodIcon method={method.method} className="h-9 w-9" />
              <div className="min-w-0 flex-1"><strong className="block truncate text-xs text-charcoal">{paymentMethodLabel(method.method, locale)}</strong><span className="mt-0.5 block text-[9px] text-muted-foreground">{method.count} {isFr ? (method.count === 1 ? "passage" : "passages") : (method.count === 1 ? "attempt" : "attempts")}</span></div>
              <span className="text-right"><strong className="block text-xs tabular-nums text-charcoal">{formatPrice(method.amount, locale)}</strong><span className="mt-0.5 block text-[9px] font-black text-terre">{formatNumber(method.share, locale)} %</span></span>
            </div>
            <span className="mt-3 block h-1.5 overflow-hidden rounded-sm bg-terre/[0.07]" aria-hidden="true"><span className="block h-full bg-terre" style={{ width: `${Math.max(4, method.share)}%` }} /></span>
          </div>
        ))}
      </div>
      <p className="border-t border-charcoal/8 px-4 py-2.5 text-[9px] leading-4 text-muted-foreground sm:px-5">{isFr ? "Lecture fondée sur les tentatives enregistrées, quel que soit leur statut final. Le registre ci-dessous reste la source de rapprochement." : "Based on recorded attempts, regardless of final status. The ledger below remains the reconciliation source."}</p>
    </section>
  );
}

function PaymentMetric({ position, icon: Icon, label, value, detail, tone }: { position: number; icon: typeof CircleDollarSign; label: string; value: string; detail: string; tone: "earth" | "gold" | "alert" | "burgundy" }) {
  const style = tone === "earth" ? "bg-terre text-white" : tone === "gold" ? "bg-gold/25 text-charcoal" : tone === "alert" ? "bg-destructive/10 text-destructive" : "bg-burgundy/10 text-burgundy";
  return <div className={`min-w-0 p-3 sm:p-5 ${position < 2 ? "border-b" : ""} ${position % 2 === 0 ? "border-r" : ""} border-charcoal/8 xl:border-b-0 ${position < 3 ? "xl:border-r" : "xl:border-r-0"}`}><span className={`grid h-9 w-9 place-items-center rounded-md ${style}`}><Icon className="h-4 w-4" /></span><p className="mt-3 truncate text-lg font-black tabular-nums text-charcoal sm:text-2xl">{value}</p><p className="mt-1 text-xs font-bold text-charcoal">{label}</p><p className="mt-1 text-[9px] leading-4 text-muted-foreground">{detail}</p></div>;
}

function PaymentStatusBadge({ status, locale }: { status: string; locale: "fr" | "en" }) {
  const captured = status === "captured";
  const exception = ["failed", "refunded"].includes(status);
  return <Badge variant="outline" className={`whitespace-nowrap text-[9px] ${captured ? "border-burgundy/25 bg-burgundy/[0.04] text-burgundy" : exception ? "border-destructive/25 bg-destructive/5 text-destructive" : "border-gold/35 bg-gold/10 text-charcoal"}`}>{captured ? <CheckCircle2 className="mr-1 h-3 w-3" /> : exception ? <AlertCircle className="mr-1 h-3 w-3" /> : <Clock3 className="mr-1 h-3 w-3" />}{paymentStatusLabel(status, locale)}</Badge>;
}

function PaymentMethodIdentity({ method, locale }: { method: string; locale: "fr" | "en" }) {
  return <div className="flex min-w-36 items-center gap-2"><PaymentMethodIcon method={method} /><div className="min-w-0"><p className="text-xs font-bold text-charcoal">{paymentMethodLabel(method, locale)}</p><p className="mt-0.5 text-[9px] text-muted-foreground">{paymentMethodFamilyLabel(method, locale)}</p></div></div>;
}

function PaymentMethodIcon({ method, className = "h-8 w-8" }: { method: string; className?: string }) {
  const family = paymentMethodFamily(method);
  const Icon = family === "card" ? CreditCard : family === "wallet" ? Smartphone : family === "bank" ? Landmark : family === "deferred" ? CalendarClock : WalletCards;
  return <span className={`grid shrink-0 place-items-center rounded-md bg-terre/10 text-terre ${className}`} aria-hidden="true"><Icon className="h-4 w-4" /></span>;
}

function formatNumber(value: number, locale: "fr" | "en") {
  return value.toLocaleString(locale === "fr" ? "fr-FR" : "en-GB", { maximumFractionDigits: 1 });
}

function paymentCountLabel(count: number, locale: "fr" | "en") {
  if (locale === "fr") return `${count} paiement${count === 1 ? "" : "s"}`;
  return `${count} payment${count === 1 ? "" : "s"}`;
}

function downloadPaymentsCsv(rows: PaymentRow[], locale: "fr" | "en") {
  const headings = locale === "fr" ? ["Référence", "Commande", "Client", "Méthode", "Statut", "Horodatage", "Montant"] : ["Reference", "Order", "Customer", "Method", "Status", "Timestamp", "Amount"];
  const body = rows.map((row) => [row.reference || "", row.orderNumber, row.customer, paymentMethodLabel(row.method, locale), paymentStatusLabel(row.status, locale), row.date, row.amount]);
  const csv = [headings, ...body].map((line) => line.map(csvCell).join(";")).join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "je-mange-africain-encaissements.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function csvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}
