"use client";

import { CheckCircle2, Clock3, RotateCcw } from "lucide-react";
import { refundAmounts } from "@/lib/admin-refunds";
import { formatPrice } from "@/lib/format";
import type { OrderRefund } from "@/lib/types";

export function OrderRefundSummary({ refunds, paymentAmount, locale, compact = false }: { refunds?: OrderRefund[]; paymentAmount: number; locale: "fr" | "en"; compact?: boolean }) {
  if (!refunds?.length) return null;
  const isFr = locale === "fr";
  const amounts = refundAmounts(paymentAmount, refunds);
  const completed = amounts.completed > 0;
  const statusAmount = completed ? amounts.completed : amounts.pending;

  return (
    <section role="status" className={`${compact ? "px-4 py-3" : "px-3.5 py-3.5"} border-y border-burgundy/18 bg-burgundy/[0.04]`} data-testid="order-refund-summary">
      <div className="flex min-w-0 items-start gap-3">
        <span className={`grid ${compact ? "h-9 w-9" : "h-10 w-10"} shrink-0 place-items-center rounded-md ${completed ? "bg-burgundy text-white" : "bg-gold/20 text-terre"}`}>
          {completed ? <RotateCcw className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0"><p className="text-[9px] font-black uppercase text-burgundy">{completed ? (isFr ? "Remboursement confirmé" : "Refund confirmed") : (isFr ? "Remboursement en traitement" : "Refund processing")}</p><p className="mt-0.5 text-xs font-black text-charcoal">{completed ? (isFr ? "Recrédité sur le moyen de paiement d'origine" : "Returned to the original payment method") : (isFr ? "Demande transmise au prestataire" : "Request sent to the provider")}</p></div>
            <strong className="shrink-0 text-sm font-black tabular-nums text-terre">{formatPrice(statusAmount, locale)}</strong>
          </div>
          {!compact ? <p className="mt-1.5 flex items-start gap-1.5 text-[10px] leading-4 text-muted-foreground"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-burgundy" />{completed ? (isFr ? "Selon votre banque ou votre wallet, l'affichage du crédit peut prendre quelques jours ouvrés." : "Depending on your bank or wallet, the credit may take a few business days to appear.") : (isFr ? "Le montant apparaîtra ici dès la confirmation définitive." : "The amount will be updated here as soon as it is finally confirmed.")}</p> : null}
        </div>
      </div>
    </section>
  );
}
