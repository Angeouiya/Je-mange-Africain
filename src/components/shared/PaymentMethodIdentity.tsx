import { CalendarClock, CreditCard, Landmark, Smartphone, WalletCards, type LucideIcon } from "lucide-react";
import { paymentMethodFamily, paymentMethodFamilyLabel, paymentMethodHint, paymentMethodLabel } from "@/lib/payment-methods";

const FAMILY_ICONS: Record<ReturnType<typeof paymentMethodFamily>, LucideIcon> = {
  card: CreditCard,
  wallet: Smartphone,
  bank: Landmark,
  deferred: CalendarClock,
  credit: WalletCards,
  other: WalletCards,
};

export function PaymentMethodIdentity({ method, locale, compact = false, className = "" }: { method: unknown; locale: "fr" | "en"; compact?: boolean; className?: string }) {
  const family = paymentMethodFamily(method);
  const Icon = FAMILY_ICONS[family];

  return (
    <span className={`flex min-w-0 items-center gap-2.5 ${className}`} data-testid="payment-method-identity">
      <span className={`grid shrink-0 place-items-center rounded-md ${family === "bank" ? "bg-burgundy/[0.08] text-burgundy" : family === "wallet" ? "bg-gold/[0.18] text-terre" : "bg-terre/[0.08] text-terre"} ${compact ? "h-8 w-8" : "h-9 w-9"}`} aria-hidden="true">
        <Icon className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
      </span>
      <span className="min-w-0">
        <strong className={`block truncate text-charcoal ${compact ? "text-[10px]" : "text-xs"}`}>{paymentMethodLabel(method, locale)}</strong>
        <span className={`mt-0.5 block truncate text-muted-foreground ${compact ? "text-[8px]" : "text-[9px]"}`}>{compact ? paymentMethodFamilyLabel(method, locale) : paymentMethodHint(method, locale)}</span>
      </span>
    </span>
  );
}
