"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { dict } from "@/lib/i18n";

const statusColors: Record<string, string> = {
  cart: "bg-muted text-muted-foreground border-border",
  paymentPending: "bg-gold/15 text-charcoal border-gold/35",
  paymentConfirmed: "bg-terre/10 text-terre border-terre/25",
  fraudCheck: "bg-gold/15 text-charcoal border-gold/35",
  validated: "bg-terre/10 text-terre border-terre/25",
  stockReserved: "bg-terre/10 text-terre border-terre/25",
  preparing: "bg-gold/15 text-charcoal border-gold/35",
  replacement: "bg-gold/15 text-charcoal border-gold/35",
  awaitingClient: "bg-gold/15 text-charcoal border-gold/35",
  controlDone: "bg-terre/10 text-terre border-terre/25",
  packed: "bg-terre/10 text-terre border-terre/25",
  shipped: "bg-terre/10 text-terre border-terre/25",
  inTransit: "bg-terre/10 text-terre border-terre/25",
  delivering: "bg-terre/10 text-terre border-terre/25",
  delivered: "bg-forest text-cream border-transparent",
  failed: "bg-destructive/10 text-destructive border-destructive/30",
  partialRefund: "bg-gold/15 text-charcoal border-gold/35",
  refunded: "bg-destructive/10 text-destructive border-destructive/30",
  cancelled: "bg-destructive/10 text-destructive border-destructive/30",
};

const dotColor: Record<string, string> = {
  paymentConfirmed: "bg-terre",
  stockReserved: "bg-terre",
  validated: "bg-terre",
  controlDone: "bg-terre",
  packed: "bg-terre",
  delivered: "bg-forest",
  preparing: "bg-gold",
  paymentPending: "bg-gold",
  fraudCheck: "bg-gold",
  awaitingClient: "bg-gold",
  replacement: "bg-gold",
  shipped: "bg-terre",
  inTransit: "bg-terre",
  delivering: "bg-terre",
  failed: "bg-destructive",
  cancelled: "bg-destructive",
  refunded: "bg-destructive",
  partialRefund: "bg-gold",
  cart: "bg-muted-foreground",
};

interface StatusBadgeProps {
  status: string;
  className?: string;
  showDot?: boolean;
}

export function StatusBadge({ status, className, showDot = true }: StatusBadgeProps) {
  const locale = useStore((s) => s.locale);
  const t = dict[locale];
  const label = (t.orders.statuses as any)[status] || status;
  const c = statusColors[status] || "bg-muted text-muted-foreground border-border";
  const dot = dotColor[status] || "bg-muted-foreground";
  return (
    <Badge variant="outline" className={cn("border gap-1.5 font-medium", c, className)}>
      {showDot && <span className={cn("size-1.5 rounded-full", dot)} />}
      {label}
    </Badge>
  );
}
