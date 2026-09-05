"use client";

import { useMemo, useState, type MouseEvent } from "react";
import { CheckCircle2, CircleDollarSign, LoaderCircle, RotateCcw, ShieldCheck, TriangleAlert } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { REFUND_REASONS, refundAmounts, refundReasonLabel, type RefundReason } from "@/lib/admin-refunds";
import { formatPrice } from "@/lib/format";
import { paymentMethodLabel } from "@/lib/payment-methods";

type RefundRow = { id: string; amount: number; status: string; reason?: string; createdAt: string };

export function PaymentRefundDialog({
  payment,
  order,
  refunds,
  locale,
  canUpdate,
  onCompleted,
  compact = false,
}: {
  payment: { id: string; amount: number; method: string; status: string; reference?: string | null };
  order: { id: string; number: string; customer: string; status: string };
  refunds: RefundRow[];
  locale: "fr" | "en";
  canUpdate: boolean;
  onCompleted: () => void;
  compact?: boolean;
}) {
  const isFr = locale === "fr";
  const amounts = useMemo(() => refundAmounts(payment.amount, refunds), [payment.amount, refunds]);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"full" | "partial">("full");
  const [partialAmount, setPartialAmount] = useState("");
  const [reason, setReason] = useState<RefundReason>("customer_request");
  const [note, setNote] = useState("");
  const [requestId, setRequestId] = useState("");
  const [status, setStatus] = useState<"idle" | "busy" | "completed" | "pending" | "error">("idle");
  const [message, setMessage] = useState("");
  const requestedAmount = mode === "full" ? amounts.refundable : Number(partialAmount.replace(",", "."));
  const amountReady = Number.isFinite(requestedAmount) && requestedAmount > 0 && Math.round(requestedAmount * 100) <= Math.round(amounts.refundable * 100);
  const ready = amountReady && note.trim().length >= 8 && status !== "busy";
  const eligible = canUpdate && payment.status === "captured" && amounts.refundable > 0;

  const changeOpen = (nextOpen: boolean) => {
    if (status === "busy") return;
    setOpen(nextOpen);
    if (nextOpen) {
      setMode("full");
      setPartialAmount("");
      setReason("customer_request");
      setNote("");
      setRequestId(window.crypto.randomUUID());
      setStatus("idle");
      setMessage("");
    }
  };

  const submit = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (!ready || !requestId) return;
    setStatus("busy");
    setMessage("");
    const response = await fetch(`/api/admin/payments/${payment.id}/refund`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Math.round(requestedAmount * 100) / 100, reason, note: note.trim(), requestId, locale }),
    }).catch(() => null);
    const payload = response ? await response.json().catch(() => ({})) as { error?: string; refund?: { status?: string } } : {};
    if (!response?.ok) {
      setStatus("error");
      setMessage(payload.error || (isFr ? "Le remboursement n'a pas pu être transmis." : "The refund could not be submitted."));
      return;
    }
    const pending = response.status === 202 || payload.refund?.status === "pending";
    setStatus(pending ? "pending" : "completed");
    setMessage(pending
      ? (isFr ? "La demande est enregistrée et attend la confirmation du prestataire." : "The request is recorded and awaiting provider confirmation.")
      : (isFr ? "Le remboursement est confirmé et la commande a été mise à jour." : "The refund is confirmed and the order has been updated."));
    onCompleted();
  };

  if (!eligible) return null;

  return (
    <AlertDialog open={open} onOpenChange={changeOpen}>
      <AlertDialogTrigger asChild>
        {compact ? (
          <Button type="button" variant="outline" size="sm" className="h-9 flex-1 border-burgundy/20 bg-white px-2 text-[10px] font-black text-burgundy hover:bg-burgundy/[0.04] hover:text-burgundy">
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />{isFr ? "Rembourser" : "Refund"}
          </Button>
        ) : (
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-burgundy hover:bg-burgundy/[0.05] hover:text-burgundy" title={isFr ? "Rembourser ce paiement" : "Refund this payment"} aria-label={`${isFr ? "Rembourser le paiement" : "Refund payment"} ${payment.reference || order.number}`}>
            <RotateCcw className="h-4 w-4" />
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent className="max-h-[calc(100svh-1rem)] overflow-y-auto p-0 sm:max-w-xl" data-testid="payment-refund-dialog">
        {status === "completed" || status === "pending" ? (
          <div className="p-5 sm:p-6">
            <span className={`grid h-12 w-12 place-items-center rounded-md ${status === "completed" ? "bg-burgundy text-white" : "bg-gold/20 text-terre"}`}>{status === "completed" ? <CheckCircle2 className="h-5 w-5" /> : <LoaderCircle className="h-5 w-5 animate-spin" />}</span>
            <AlertDialogHeader className="mt-4">
              <AlertDialogTitle>{status === "completed" ? (isFr ? "Remboursement confirmé" : "Refund confirmed") : (isFr ? "Remboursement en traitement" : "Refund processing")}</AlertDialogTitle>
              <AlertDialogDescription>{message}</AlertDialogDescription>
            </AlertDialogHeader>
            <div className="mt-5 grid grid-cols-2 divide-x divide-burgundy/10 border-y border-burgundy/10 py-3 text-xs">
              <div className="pr-3"><span className="text-[9px] font-bold uppercase text-muted-foreground">{isFr ? "Commande" : "Order"}</span><strong className="mt-1 block text-charcoal">{order.number}</strong></div>
              <div className="pl-3"><span className="text-[9px] font-bold uppercase text-muted-foreground">{isFr ? "Montant" : "Amount"}</span><strong className="mt-1 block text-terre">{formatPrice(requestedAmount, locale)}</strong></div>
            </div>
            <AlertDialogFooter className="mt-5"><AlertDialogCancel className="bg-terre text-white hover:bg-terre-dark hover:text-white">{isFr ? "Fermer" : "Close"}</AlertDialogCancel></AlertDialogFooter>
          </div>
        ) : (
          <>
            <div className="border-b border-burgundy/10 bg-[#FFF8F4] px-5 py-5 sm:px-6">
              <span className="grid h-11 w-11 place-items-center rounded-md bg-terre text-white"><RotateCcw className="h-5 w-5" /></span>
              <AlertDialogHeader className="mt-4">
                <p className="text-[9px] font-black uppercase text-burgundy">{isFr ? "Décision financière sensible" : "Sensitive financial decision"}</p>
                <AlertDialogTitle>{isFr ? "Confirmer un remboursement" : "Confirm a refund"}</AlertDialogTitle>
                <AlertDialogDescription>{isFr ? "Le prestataire recréditera le moyen de paiement d'origine. Cette action est tracée et ne pourra pas être annulée depuis la plateforme." : "The provider will credit the original payment method. This action is audited and cannot be reversed from the platform."}</AlertDialogDescription>
              </AlertDialogHeader>
            </div>

            <div className="space-y-5 px-5 py-1 sm:px-6">
              <section className="grid grid-cols-3 divide-x divide-charcoal/8 border-y border-charcoal/8 py-3" aria-label={isFr ? "Situation du paiement" : "Payment position"}>
                <RefundFact label={isFr ? "Paiement" : "Payment"} value={formatPrice(payment.amount, locale)} />
                <RefundFact label={isFr ? "Déjà engagé" : "Already committed"} value={formatPrice(amounts.committed, locale)} />
                <RefundFact label={isFr ? "Remboursable" : "Refundable"} value={formatPrice(amounts.refundable, locale)} accent />
              </section>

              <div>
                <Label className="mb-2 block text-xs font-bold text-charcoal">{isFr ? "Portée du remboursement" : "Refund scope"}</Label>
                <div className="grid grid-cols-2 overflow-hidden rounded-md border border-burgundy/15" role="group" aria-label={isFr ? "Choisir la portée" : "Choose refund scope"}>
                  {(["full", "partial"] as const).map((value) => <button key={value} type="button" onClick={() => { setMode(value); setMessage(""); setStatus("idle"); }} aria-pressed={mode === value} className={`min-h-11 px-3 text-xs font-black transition ${value === "partial" ? "border-l border-burgundy/15" : ""} ${mode === value ? "bg-burgundy text-white" : "bg-white text-muted-foreground hover:bg-burgundy/[0.04] hover:text-burgundy"}`}>{value === "full" ? (isFr ? "Solde total" : "Full balance") : (isFr ? "Montant partiel" : "Partial amount")}</button>)}
                </div>
              </div>

              {mode === "partial" ? <div><Label htmlFor="refund-amount" className="mb-1.5 block text-xs font-bold">{isFr ? "Montant à rembourser" : "Amount to refund"}</Label><div className="relative"><CircleDollarSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-terre" /><Input id="refund-amount" type="number" inputMode="decimal" min={0.01} max={amounts.refundable} step={0.01} value={partialAmount} onChange={(event) => { setPartialAmount(event.target.value); setStatus("idle"); setMessage(""); }} className="h-11 pl-9 pr-10" required /><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-muted-foreground">€</span></div>{partialAmount && !amountReady ? <p role="alert" className="mt-1.5 text-[10px] text-destructive">{isFr ? `Saisissez un montant compris entre 0,01 € et ${formatPrice(amounts.refundable, locale)}.` : `Enter an amount between €0.01 and ${formatPrice(amounts.refundable, locale)}.`}</p> : null}</div> : null}

              <div><Label htmlFor="refund-reason" className="mb-1.5 block text-xs font-bold">{isFr ? "Motif opérationnel" : "Operational reason"}</Label><select id="refund-reason" value={reason} onChange={(event) => setReason(event.target.value as RefundReason)} className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm text-charcoal">{REFUND_REASONS.map((value) => <option key={value} value={value}>{refundReasonLabel(value, locale)}</option>)}</select></div>
              <div><div className="mb-1.5 flex items-center justify-between gap-3"><Label htmlFor="refund-note" className="text-xs font-bold">{isFr ? "Justification interne" : "Internal evidence"}</Label><span className="text-[9px] font-bold tabular-nums text-muted-foreground">{note.length}/500</span></div><Textarea id="refund-note" value={note} onChange={(event) => { setNote(event.target.value); setStatus("idle"); setMessage(""); }} maxLength={500} minLength={8} rows={3} placeholder={isFr ? "Décrivez les faits contrôlés et la décision prise..." : "Describe the verified facts and decision..."} className="resize-y" required /><p className="mt-1.5 text-[9px] leading-4 text-muted-foreground">{isFr ? "Visible dans le journal d'audit, jamais dans l'espace client." : "Visible in the audit log, never in the customer workspace."}</p></div>

              <div className="flex items-start gap-3 border-y border-gold/35 bg-gold/[0.07] px-3 py-3 text-[10px] leading-4 text-charcoal"><TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-terre" /><p><strong>{isFr ? "Conséquence" : "Consequence"}</strong> · {mode === "full" ? (isFr ? "Le paiement sera intégralement remboursé et la commande sera clôturée comme remboursée." : "The payment will be fully refunded and the order closed as refunded.") : (isFr ? "La commande conservera son état logistique; seul le montant confirmé sera déduit de la rentabilité." : "The order keeps its fulfilment state; only the confirmed amount is deducted from profitability.")}</p></div>

              {status === "error" ? <p role="alert" className="flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/[0.05] px-3 py-2.5 text-xs leading-5 text-destructive"><TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />{message}</p> : null}
              <div className="flex items-center gap-2 text-[9px] font-bold text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5 text-burgundy" />{paymentMethodLabel(payment.method, locale)} · {payment.reference || order.number}</div>
            </div>

            <AlertDialogFooter className="border-t border-burgundy/10 px-5 py-4 sm:px-6">
              <AlertDialogCancel disabled={status === "busy"}>{isFr ? "Non, conserver" : "No, keep payment"}</AlertDialogCancel>
              <AlertDialogAction onClick={submit} disabled={!ready} className="bg-terre text-white hover:bg-terre-dark">
                {status === "busy" ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
                {status === "busy" ? (isFr ? "Transmission..." : "Submitting...") : `${isFr ? "Oui, rembourser" : "Yes, refund"} ${amountReady ? formatPrice(requestedAmount, locale) : ""}`}
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}

function RefundFact({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return <div className="min-w-0 px-2.5 first:pl-0 last:pr-0"><span className="block truncate text-[8px] font-black uppercase text-muted-foreground">{label}</span><strong className={`mt-1 block truncate text-xs tabular-nums ${accent ? "text-terre" : "text-charcoal"}`}>{value}</strong></div>;
}
