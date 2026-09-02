export const NON_COMMERCIAL_ORDER_STATUSES = ["cart", "cancelled"] as const;

export type CustomerSegment = "ambassador" | "active" | "at_risk" | "new";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export function customerSegment(input: {
  orders: number;
  lifetimeValue: number;
  loyalty: number;
  lastOrderAt?: string | Date | null;
  now?: Date;
}): CustomerSegment {
  if (input.orders === 0) return "new";

  const now = input.now || new Date();
  const lastOrder = input.lastOrderAt ? new Date(input.lastOrderAt) : null;
  if (lastOrder && Number.isFinite(lastOrder.getTime())) {
    const inactiveDays = Math.floor((now.getTime() - lastOrder.getTime()) / DAY_IN_MS);
    if (inactiveDays >= 60) return "at_risk";
  }

  if (input.orders >= 5 || input.lifetimeValue >= 300 || input.loyalty >= 1000) return "ambassador";
  return "active";
}
