"use client";

import { useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, CircleDollarSign, CreditCard, ReceiptText, Search } from "lucide-react";
import { AdminEmptyState, AdminErrorState, AdminPageHeader, AdminSectionLoading, SectionTabs } from "@/components/admin/AdminPrimitives";
import type { AdminOrder } from "@/components/admin/admin-types";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useFetch } from "@/lib/use-fetch";
import { formatDateTime, formatPrice, normalize } from "@/lib/format";

type PaymentFilter = "all" | "captured" | "pending" | "exceptions";
type PaymentRow = AdminOrder["payments"][number] & { id: string; orderNumber: string; date: string; customer: string };

export default function FinanceSection({ locale }: { locale: "fr" | "en" }) {
  const isFr = locale === "fr";
  const { data, loading, error, refetch } = useFetch<{ orders: AdminOrder[] }>(`/api/orders?locale=${locale}`, [locale]);
  const [filter, setFilter] = useState<PaymentFilter>("all");
  const [query, setQuery] = useState("");
  const payments: PaymentRow[] = useMemo(() => (data?.orders || []).flatMap((order) => order.payments.map((payment, index) => ({ ...payment, id: `${order.id}-${index}`, orderNumber: order.number, date: order.createdAt, customer: order.deliveryName }))), [data]);
  const captured = payments.filter((payment) => payment.status === "captured");
  const pending = payments.filter((payment) => ["pending", "authorized"].includes(payment.status));
  const exceptions = payments.filter((payment) => ["failed", "refunded"].includes(payment.status));
  const capturedAmount = captured.reduce((sum, payment) => sum + payment.amount, 0);
  const pendingAmount = pending.reduce((sum, payment) => sum + payment.amount, 0);
  const exceptionAmount = exceptions.reduce((sum, payment) => sum + payment.amount, 0);
  const filteredPayments = useMemo(() => payments.filter((payment) => {
    const matchesFilter = filter === "all" || (filter === "captured" && payment.status === "captured") || (filter === "pending" && ["pending", "authorized"].includes(payment.status)) || (filter === "exceptions" && ["failed", "refunded"].includes(payment.status));
    const matchesQuery = normalize(`${payment.orderNumber} ${payment.reference || ""} ${payment.method} ${payment.customer}`).includes(normalize(query));
    return matchesFilter && matchesQuery;
  }), [filter, payments, query]);

  if (loading) return <AdminSectionLoading label={isFr ? "Rapprochement des encaissements" : "Reconciling payments"} />;
  if (error) return <AdminErrorState message={error} onRetry={refetch} />;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow={isFr ? "Registre financier" : "Finance ledger"}
        title={isFr ? "Chaque euro, un statut" : "Every euro, one status"}
        description={isFr ? "Un registre d'encaissement centré sur le rapprochement : capturé, en attente ou à examiner. Les commandes restent dans leur propre flux opérationnel." : "A payment ledger focused on reconciliation: captured, pending or requiring review. Orders remain in their own operational workflow."}
      />

      <section className="grid overflow-hidden rounded-lg border border-black/8 bg-white lg:grid-cols-[1.25fr_0.75fr_0.75fr]">
        <div className="bg-charcoal p-5 text-white sm:p-6"><span className="grid h-10 w-10 place-items-center rounded-md bg-forest text-white"><CircleDollarSign className="h-5 w-5" /></span><p className="mt-5 text-3xl font-black tabular-nums">{formatPrice(capturedAmount, locale)}</p><p className="mt-1 text-[11px] font-bold text-white/50">{isFr ? "montant capturé" : "captured amount"}</p></div>
        <div className="border-t border-black/8 p-5 lg:border-l lg:border-t-0"><span className="grid h-9 w-9 place-items-center rounded-md bg-gold/15 text-amber-700"><CreditCard className="h-4 w-4" /></span><p className="mt-4 text-2xl font-black tabular-nums">{formatPrice(pendingAmount, locale)}</p><p className="mt-1 text-[10px] font-bold text-muted-foreground">{isFr ? "en attente" : "pending"}</p></div>
        <div className="border-t border-black/8 p-5 lg:border-l lg:border-t-0"><span className="grid h-9 w-9 place-items-center rounded-md bg-destructive/10 text-destructive"><AlertCircle className="h-4 w-4" /></span><p className="mt-4 text-2xl font-black tabular-nums">{formatPrice(exceptionAmount, locale)}</p><p className="mt-1 text-[10px] font-bold text-muted-foreground">{isFr ? "à examiner" : "to review"}</p></div>
      </section>

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <SectionTabs value={filter} onChange={setFilter} label={isFr ? "Statuts financiers" : "Financial statuses"} items={[
          { value: "all", label: isFr ? "Tous" : "All", count: payments.length },
          { value: "captured", label: isFr ? "Capturés" : "Captured", count: captured.length },
          { value: "pending", label: isFr ? "En attente" : "Pending", count: pending.length },
          { value: "exceptions", label: isFr ? "Exceptions" : "Exceptions", count: exceptions.length },
        ]} />
        <label className="relative block w-full xl:max-w-sm"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} className="h-10 bg-white pl-9" placeholder={isFr ? "Commande, référence ou client" : "Order, reference or customer"} /></label>
      </div>

      {filteredPayments.length ? <div className="overflow-hidden rounded-lg border border-black/8 bg-white"><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>{isFr ? "Référence" : "Reference"}</TableHead><TableHead>{isFr ? "Commande et client" : "Order and customer"}</TableHead><TableHead>{isFr ? "Méthode" : "Method"}</TableHead><TableHead>{isFr ? "Statut" : "Status"}</TableHead><TableHead>{isFr ? "Horodatage" : "Timestamp"}</TableHead><TableHead className="text-right">{isFr ? "Montant" : "Amount"}</TableHead></TableRow></TableHeader><TableBody>{filteredPayments.map((payment) => <TableRow key={payment.id}><TableCell><div className="flex items-center gap-2"><ReceiptText className="h-4 w-4 text-terre" /><span className="text-xs font-bold text-charcoal">{payment.reference || "—"}</span></div></TableCell><TableCell><p className="text-xs font-extrabold text-terre">{payment.orderNumber}</p><p className="mt-0.5 text-[10px] text-muted-foreground">{payment.customer}</p></TableCell><TableCell className="text-xs font-semibold">{payment.method}</TableCell><TableCell><Badge variant="outline" className={payment.status === "captured" ? "border-forest/25 bg-forest/[0.04] text-forest" : ["failed", "refunded"].includes(payment.status) ? "border-destructive/25 bg-destructive/5 text-destructive" : "border-gold/35 bg-gold/10 text-amber-800"}>{payment.status === "captured" ? <CheckCircle2 className="mr-1 h-3 w-3" /> : null}{payment.status}</Badge></TableCell><TableCell className="text-[10px] text-muted-foreground">{formatDateTime(payment.date, locale)}</TableCell><TableCell className="text-right text-sm font-black tabular-nums">{formatPrice(payment.amount, locale)}</TableCell></TableRow>)}</TableBody></Table></div></div> : <AdminEmptyState icon={<ReceiptText className="h-5 w-5" />} title={isFr ? "Aucun mouvement financier" : "No financial movements"} description={isFr ? "Aucun paiement ne correspond aux filtres sélectionnés." : "No payment matches the selected filters."} />}
    </div>
  );
}
