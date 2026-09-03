import type { Order } from "@/lib/types";

const terminalStatuses = new Set(["delivered", "cancelled", "canceled", "refunded", "failed", "partialrefund"]);
const attentionStatuses = new Set(["awaitingclient", "replacement", "failed", "paymentpending"]);
const excludedValueStatuses = new Set(["cart", "paymentpending", "cancelled", "canceled", "refunded", "failed"]);

const canonicalStatus = (status: string) => status.replace(/[^a-z0-9]/gi, "").toLowerCase();

export function isTerminalOrder(status: string) {
  return terminalStatuses.has(canonicalStatus(status));
}

export function orderNeedsAttention(status: string) {
  return attentionStatuses.has(canonicalStatus(status));
}

export function getOrderStageIndex(status: string) {
  const canonical = canonicalStatus(status);
  if (["cancelled", "canceled", "refunded", "failed"].includes(canonical)) return -1;
  if (canonical === "delivered") return 3;
  if (["shipped", "intransit", "outfordelivery", "delivering"].includes(canonical)) return 2;
  if (["preparing", "packed", "controldone"].includes(canonical)) return 1;
  return 0;
}

export function getOrderProgress(status: string) {
  const stage = getOrderStageIndex(status);
  return stage < 0 ? 0 : [18, 48, 76, 100][stage];
}

export function getOrderDeliveryTimestamp(order: Pick<Order, "status" | "shipments">) {
  const delivered = canonicalStatus(order.status) === "delivered";
  const values = order.shipments
    .map((shipment) => delivered ? shipment.actualDelivery || shipment.estimatedDelivery : shipment.estimatedDelivery)
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => new Date(left).getTime() - new Date(right).getTime());
  return values[0] || null;
}

export function summarizeOrders(orders: Order[]) {
  const active = orders.filter((order) => !isTerminalOrder(order.status)).length;
  const delivered = orders.filter((order) => canonicalStatus(order.status) === "delivered").length;
  const attention = orders.filter((order) => orderNeedsAttention(order.status)).length;
  const orderedValue = orders.reduce((sum, order) => excludedValueStatuses.has(canonicalStatus(order.status)) ? sum : sum + order.total, 0);
  const focusOrder = orders.find((order) => orderNeedsAttention(order.status))
    || orders.find((order) => !isTerminalOrder(order.status))
    || null;

  return { total: orders.length, active, delivered, attention, orderedValue, focusOrder };
}
