import { Clock3, RefreshCw, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PaymentRecovery } from "@/lib/payment-recovery-storage";

export function PaymentRecoveryNotice({ recovery, locale, onRetry, retrying = false }: { recovery: PaymentRecovery; locale: "fr" | "en"; onRetry?: () => void; retrying?: boolean }) {
  const refunded = recovery.status === "refund_submitted";
  const Icon = refunded ? RotateCcw : Clock3;
  return (
    <section role="status" data-testid="payment-recovery" className={`border-y px-3.5 py-3 ${refunded ? "border-burgundy/20 bg-burgundy/[0.045]" : "border-gold/35 bg-gold/[0.08]"}`}>
      <div className="flex items-start gap-3">
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-md ${refunded ? "bg-burgundy text-white" : "bg-white text-terre"}`}><Icon className="h-4 w-4" /></span>
        <div className="min-w-0">
          <h3 className="text-xs font-black text-charcoal">{refunded ? (locale === "fr" ? "Remboursement automatique lancé" : "Automatic refund started") : (locale === "fr" ? "Paiement protégé, finalisation en cours" : "Payment protected, finalisation in progress")}</h3>
          <p className="mt-1 text-[10px] leading-4 text-muted-foreground">{refunded
            ? (locale === "fr" ? "Aucune commande n'a été créée. Le montant repart vers le moyen de paiement utilisé ; vous pouvez vérifier le panier avant une nouvelle tentative." : "No order was created. The amount is returning to the original payment method; review the basket before trying again.")
            : (locale === "fr" ? "Ne payez pas une seconde fois. Réessayez uniquement la finalisation depuis cet écran pendant que nous rapprochons la transaction." : "Do not pay a second time. Retry finalisation only from this screen while we reconcile the transaction.")}</p>
          <p className="mt-1.5 break-all font-mono text-[9px] font-bold text-burgundy">{locale === "fr" ? "Référence" : "Reference"} · {recovery.reference}</p>
          {!refunded && onRetry ? <Button type="button" size="sm" variant="outline" onClick={onRetry} disabled={retrying} className="mt-2.5 h-9 border-burgundy/20 bg-white text-[10px] font-black text-burgundy hover:bg-burgundy/[0.04] hover:text-burgundy"><RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${retrying ? "animate-spin" : ""}`} />{retrying ? (locale === "fr" ? "Rapprochement..." : "Reconciling...") : (locale === "fr" ? "Reprendre la finalisation" : "Resume finalisation")}</Button> : null}
        </div>
      </div>
    </section>
  );
}
