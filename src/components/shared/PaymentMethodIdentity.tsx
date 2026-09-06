import type { IconFunction } from "reicon/createIcon";
import { Bank } from "reicon/icons/Bank";
import { Clock3 } from "reicon/icons/Clock3";
import { CreditCard } from "reicon/icons/CreditCard";
import { Mobile } from "reicon/icons/Mobile";
import { Wallet } from "reicon/icons/Wallet";
import { ReiconGlyph } from "@/components/ui/reicon-glyph";
import { paymentMethodFamily, paymentMethodFamilyLabel, paymentMethodHint, paymentMethodLabel } from "@/lib/payment-methods";

const FAMILY_ICONS: Record<ReturnType<typeof paymentMethodFamily>, IconFunction> = {
  card: CreditCard,
  wallet: Mobile,
  bank: Bank,
  deferred: Clock3,
  credit: Wallet,
  other: Wallet,
};

const FAMILY_TONES: Record<ReturnType<typeof paymentMethodFamily>, string> = {
  card: "border-terre/18 bg-terre/[0.08] text-terre",
  wallet: "border-gold/30 bg-gold/[0.18] text-burgundy",
  bank: "border-burgundy/18 bg-burgundy/[0.08] text-burgundy",
  deferred: "border-gold/35 bg-gold/[0.14] text-charcoal",
  credit: "border-terre/16 bg-terre/[0.06] text-terre",
  other: "border-charcoal/10 bg-muted text-muted-foreground",
};

export function PaymentMethodIdentity({ method, locale, compact = false, className = "" }: { method: unknown; locale: "fr" | "en"; compact?: boolean; className?: string }) {
  const family = paymentMethodFamily(method);

  return (
    <span className={`flex min-w-0 items-center gap-2.5 ${className}`} data-testid="payment-method-identity">
      <span className={`grid shrink-0 place-items-center rounded-md border shadow-[0_10px_24px_-22px_rgba(90,38,50,0.65)] ${FAMILY_TONES[family]} ${compact ? "h-8 w-8" : "h-9 w-9"}`}>
        <ReiconGlyph icon={FAMILY_ICONS[family]} weight={family === "other" ? "Outline" : "Filled"} className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
      </span>
      <span className="min-w-0">
        <strong className={`block truncate text-charcoal ${compact ? "text-[10px]" : "text-xs"}`}>{paymentMethodLabel(method, locale)}</strong>
        <span className={`mt-0.5 block truncate text-muted-foreground ${compact ? "text-[8px]" : "text-[9px]"}`}>{compact ? paymentMethodFamilyLabel(method, locale) : paymentMethodHint(method, locale)}</span>
      </span>
    </span>
  );
}
