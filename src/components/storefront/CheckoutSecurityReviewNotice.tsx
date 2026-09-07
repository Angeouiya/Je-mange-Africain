import { PencilLine, ShoppingBag } from "lucide-react";
import { ShieldCheck as ReShieldCheck } from "reicon/icons/ShieldCheck";
import { Button } from "@/components/ui/button";
import { ReiconGlyph } from "@/components/ui/reicon-glyph";

export function CheckoutSecurityReviewNotice({
  locale,
  message,
  onEditDelivery,
  onReviewCart,
}: {
  locale: "fr" | "en";
  message?: string;
  onEditDelivery?: () => void;
  onReviewCart?: () => void;
}) {
  const isFr = locale === "fr";

  return (
    <section
      role="alert"
      data-testid="checkout-security-review"
      className="border-y border-burgundy/20 bg-burgundy/[0.045] px-3.5 py-4 text-charcoal"
    >
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-white text-burgundy shadow-sm">
          <ReiconGlyph icon={ReShieldCheck} className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-black uppercase text-burgundy">{isFr ? "Contrôle sécurité" : "Security review"}</p>
          <h3 className="mt-1 text-sm font-black leading-5 text-charcoal">{isFr ? "Paiement non lancé, commande non validée" : "Payment not started, order not confirmed"}</h3>
          <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
            {message || (isFr
              ? "Cette tentative nécessite une vérification serveur avant paiement. Votre panier reste disponible et aucune commande n'a été bouclée."
              : "This attempt needs server verification before payment. Your basket remains available and no order has been completed.")}
          </p>
          <div className="mt-3 flex flex-col gap-2 min-[420px]:flex-row">
            {onEditDelivery ? (
              <Button type="button" size="sm" onClick={onEditDelivery} className="h-9 bg-terre text-white hover:bg-terre-dark">
                <PencilLine className="mr-1.5 h-3.5 w-3.5" />
                {isFr ? "Modifier les informations" : "Edit details"}
              </Button>
            ) : null}
            {onReviewCart ? (
              <Button type="button" size="sm" variant="outline" onClick={onReviewCart} className="h-9 border-burgundy/20 bg-white text-burgundy hover:bg-burgundy/[0.04] hover:text-burgundy">
                <ShoppingBag className="mr-1.5 h-3.5 w-3.5" />
                {isFr ? "Revoir le panier" : "Review basket"}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
