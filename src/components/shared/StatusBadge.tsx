"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { dict } from "@/lib/i18n";

const statusColors: Record<string, string> = {
  cart: "bg-muted text-muted-foreground border-border",
  paymentPending: "bg-amber-50 text-amber-700 border-amber-200",
  paymentConfirmed: "bg-rose-50 text-rose-800 border-rose-200",
  fraudCheck: "bg-amber-50 text-amber-700 border-amber-200",
  validated: "bg-rose-50 text-rose-800 border-rose-200",
  stockReserved: "bg-rose-50 text-rose-800 border-rose-200",
  preparing: "bg-amber-50 text-amber-700 border-amber-200",
  replacement: "bg-amber-50 text-amber-700 border-amber-200",
  awaitingClient: "bg-amber-50 text-amber-700 border-amber-200",
  controlDone: "bg-rose-50 text-rose-800 border-rose-200",
  packed: "bg-rose-50 text-rose-800 border-rose-200",
  shipped: "bg-blue-50 text-blue-700 border-blue-200",
  inTransit: "bg-blue-50 text-blue-700 border-blue-200",
  delivering: "bg-blue-50 text-blue-700 border-blue-200",
  delivered: "bg-forest text-cream border-transparent",
  failed: "bg-destructive/10 text-destructive border-destructive/30",
  partialRefund: "bg-amber-50 text-amber-700 border-amber-200",
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
  preparing: "bg-amber-500",
  paymentPending: "bg-amber-500",
  fraudCheck: "bg-amber-500",
  awaitingClient: "bg-amber-500",
  replacement: "bg-amber-500",
  shipped: "bg-blue-500",
  inTransit: "bg-blue-500",
  delivering: "bg-blue-500",
  failed: "bg-destructive",
  cancelled: "bg-destructive",
  refunded: "bg-destructive",
  partialRefund: "bg-amber-500",
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
