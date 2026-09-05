"use client";

import { useMemo, useState } from "react";
import { AlertCircle, ArrowRight, CalendarClock, CheckCircle2, CircleDollarSign, Clock3, CreditCard, Download, Landmark, ReceiptText, ShieldCheck, Smartphone, WalletCards } from "lucide-react";
import { AdminEmptyState, AdminErrorState, AdminSearchField, AdminSectionLoading, SectionTabs } from "@/components/admin/AdminPrimitives";
import type { AdminOrder } from "@/components/admin/admin-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime, formatPrice, normalize } from "@/lib/format";
import { paymentMethodFamily, paymentMethodFamilyLabel, paymentMethodLabel, paymentStatusLabel } from "@/lib/payment-methods";
import { useFetch } from "@/lib/use-fetch";

type PaymentFilter = "all" | "captured" | "pending" | "exceptions";
type PaymentRow = AdminOrder["payments"][number] & { id: string; orderId: string; orderNumber: string; date: string; customer: string };

const EMPTY_ORDERS: AdminOrder[] = [];

export function FinancePaymentLedger({ locale, onNavigate }: { locale: "fr" | "en"; onNavigate?: (destination: "orders") => void }) {
  const isFr = locale === "fr";
  const request = useFetch<{ orders: AdminOrder[] }>(`/api/orders?locale=${locale}`, [locale]);
  const [filter, setFilter] = useState<PaymentFilter>("all");
  const [query, setQuery] = useState("");
  const orders = request.data?.orders ?? EMPTY_ORDERS;
  const payments: PaymentRow[] = useMemo(() => orders.flatMap((order) => order.payments.map((payment, index) => ({
    ...payment,
    id: payment.id || `${order.id}-${index}`,
    orderId: order.id,
    orderNumber: order.number,
    date: payment.createdAt || order.createdAt,
    customer: order.deliveryName,
  }))), [orders]);
  const captured = payments.filter((payment) => payment.status === "captured");
  const pending = payments.filter((payment) => ["pending", "authorized"].includes(payment.status));
  const exceptions = payments.filter((payment) => ["failed", "refunded"].includes(payment.status));
  const capturedAmount = captured.reduce((sum, payment) => sum + payment.amount, 0);
  const pendingAmount = pending.reduce((sum, payment) => sum + payment.amount, 0);
  const exceptionAmount = exceptions.reduce((sum, payment) => sum + payment.amount, 0);
  const reconciliationRate = payments.length ? (captured.length / payments.length) * 100 : 0;
  const filteredPayments = useMemo(() => payments.filter((payment) => {
    const matchesFilter = filter === "all" || (filter === "captured" && payment.status === "captured") || (filter === "pending" && ["pending", "authorized"].includes(payment.status)) || (filter === "exceptions" && ["failed", "refunded"].includes(payment.status));
    const matchesQuery = normalize(`${payment.orderNumber} ${payment.reference || ""} ${payment.method} ${paymentMethodLabel(payment.method, locale)} ${paymentMethodFamilyLabel(payment.method, locale)} ${payment.customer}`).includes(normalize(query));
    return matchesFilter && matchesQuery;
  }), [filter, locale, payments, query]);

  if (request.loading && !request.data) return <AdminSectionLoading label={isFr ? "Rapprochement des encaissements" : "Reconciling payments"} />;
  if (request.error && !request.data) return <AdminErrorState message={request.error} onRetry={request.refetch} />;

  return (
    <div className="space-y-5">
      <section className="grid grid-cols-2 overflow-hidden rounded-lg border border-charcoal/8 bg-white xl:grid-cols-4" aria-label={isFr ? "Santé des encaissements" : "Payment health"}>
        <PaymentMetric position={0} icon={CircleDollarSign} label={isFr ? "Capturé" : "Captured"} value={formatPrice(capturedAmount, locale)} detail={paymentCountLabel(captured.length, locale)} tone="earth" />
        <PaymentMetric position={1} icon={Clock3} label={isFr ? "À finaliser" : "To complete"} value={formatPrice(pendingAmount, locale)} detail={`${pending.length} ${isFr ? "en attente" : "pending"}`} tone="gold" />
        <PaymentMetric position={2} icon={AlertCircle} label={isFr ? "Exceptions" : "Exceptions"} value={formatPrice(exceptionAmount, locale)} detail={`${exceptions.length} ${isFr ? "à examiner" : "to review"}`} tone={exceptions.length ? "alert" : "burgundy"} />
        <PaymentMetric position={3} icon={ShieldCheck} label={isFr ? "Taux rapproché" : "Reconciled rate"} value={`${formatNumber(reconciliationRate, locale)} %`} detail={isFr ? "sur le registre chargé" : "of loaded ledger"} tone="burgundy" />
      </section>

      <div className="flex items-start gap-3 border-y border-burgundy/15 bg-burgundy/[0.045] px-4 py-3 text-xs leading-5 text-burgundy"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /><p><strong>{isFr ? "Registre contrôlé" : "Controlled ledger"}</strong> · {isFr ? "Chaque ligne conserve la référence du prestataire, la commande, le client et son horodatage réel." : "Every line retains its provider reference, order, customer and actual timestamp."}</p></div>

      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <SectionTabs value={filter} onChange={setFilter} label={isFr ? "Statuts financiers" : "Financial statuses"} items={[
          { value: "all", label: isFr ? "Tous" : "All", count: payments.length },
          { value: "captured", label: isFr ? "Capturés" : "Captured", count: captured.length },
          { value: "pending", label: isFr ? "En attente" : "Pending", count: pending.length },
          { value: "exceptions", label: isFr ? "Exceptions" : "Exceptions", count: exceptions.length },
        ]} />
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
          <AdminSearchField value={query} onChange={setQuery} label={isFr ? "Rechercher un encaissement" : "Search payments"} placeholder={isFr ? "Commande, référence ou client" : "Order, reference or customer"} resultCount={filteredPayments.length} totalCount={payments.length} locale={locale} className="w-full sm:w-80" />
          <Button type="button" variant="outline" size="sm" onClick={() => downloadPaymentsCsv(filteredPayments, locale)} disabled={!filteredPayments.length} className="h-10 shrink-0 border-charcoal/12"><Download className="mr-1.5 h-4 w-4" />{isFr ? "Exporter la vue" : "Export view"}</Button>
        </div>
      </div>

      {filteredPayments.length ? <section className="overflow-hidden rounded-lg border border-charcoal/8 bg-white" aria-label={isFr ? "Registre des encaissements" : "Payment ledger"}>
        <div className="hidden overflow-x-auto md:block"><Table><TableHeader><TableRow><TableHead>{isFr ? "Référence" : "Reference"}</TableHead><TableHead>{isFr ? "Commande et client" : "Order and customer"}</TableHead><TableHead>{isFr ? "Méthode" : "Method"}</TableHead><TableHead>{isFr ? "Statut" : "Status"}</TableHead><TableHead>{isFr ? "Horodatage" : "Timestamp"}</TableHead><TableHead className="text-right">{isFr ? "Montant" : "Amount"}</TableHead><TableHead><span className="sr-only">{isFr ? "Action" : "Action"}</span></TableHead></TableRow></TableHeader><TableBody>{filteredPayments.map((payment) => <TableRow key={payment.id}><TableCell><div className="flex items-center gap-2"><ReceiptText className="h-4 w-4 text-terre" /><span className="text-xs font-bold text-charcoal">{payment.reference || "—"}</span></div></TableCell><TableCell><p className="text-xs font-extrabold text-terre">{payment.orderNumber}</p><p className="mt-0.5 text-[10px] text-muted-foreground">{payment.customer}</p></TableCell><TableCell><PaymentMethodIdentity method={payment.method} locale={locale} /></TableCell><TableCell><PaymentStatusBadge status={payment.status} locale={locale} /></TableCell><TableCell className="text-[10px] text-muted-foreground">{formatDateTime(payment.date, locale)}</TableCell><TableCell className="text-right text-sm font-black tabular-nums">{formatPrice(payment.amount, locale)}</TableCell><TableCell className="text-right">{onNavigate ? <Button type="button" variant="ghost" size="icon" onClick={() => onNavigate("orders")} title={isFr ? "Ouvrir les commandes" : "Open orders"} aria-label={`${isFr ? "Ouvrir la commande" : "Open order"} ${payment.orderNumber}`} className="h-8 w-8 text-muted-foreground hover:text-terre"><ArrowRight className="h-4 w-4" /></Button> : null}</TableCell></TableRow>)}</TableBody></Table></div>
        <div className="divide-y divide-border md:hidden">{filteredPayments.map((payment) => <article key={payment.id} className="p-4"><div className="flex items-start gap-3"><PaymentMethodIcon method={payment.method} className="h-10 w-10" /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-xs font-black text-charcoal">{payment.reference || payment.orderNumber}</p><p className="mt-0.5 truncate text-[10px] text-muted-foreground">{payment.orderNumber} · {payment.customer}</p></div><PaymentStatusBadge status={payment.status} locale={locale} /></div></div></div><div className="mt-3 grid grid-cols-3 border-y border-charcoal/8 py-3 text-[9px]"><div><span className="text-muted-foreground">{isFr ? "Montant" : "Amount"}</span><strong className="mt-1 block text-xs tabular-nums">{formatPrice(payment.amount, locale)}</strong></div><div className="min-w-0"><span className="text-muted-foreground">{isFr ? "Méthode" : "Method"}</span><strong className="mt-1 block truncate text-xs">{paymentMethodLabel(payment.method, locale)}</strong><span className="mt-0.5 block truncate text-[9px] text-muted-foreground">{paymentMethodFamilyLabel(payment.method, locale)}</span></div><div className="text-right"><span className="text-muted-foreground">{isFr ? "Reçu" : "Received"}</span><strong className="mt-1 block text-[10px]">{formatDateTime(payment.date, locale)}</strong></div></div>{onNavigate ? <Button type="button" variant="ghost" size="sm" onClick={() => onNavigate("orders")} className="mt-2 h-8 w-full justify-between px-1 text-[10px] font-black text-terre hover:bg-transparent hover:text-terre-dark">{isFr ? "Examiner la commande" : "Review order"}<ArrowRight className="h-3.5 w-3.5" /></Button> : null}</article>)}</div>
      </section> : <AdminEmptyState icon={<ReceiptText className="h-5 w-5" />} title={isFr ? "Aucun mouvement financier" : "No financial movements"} description={isFr ? "Aucun paiement ne correspond aux filtres sélectionnés." : "No payment matches the selected filters."} />}
    </div>
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
