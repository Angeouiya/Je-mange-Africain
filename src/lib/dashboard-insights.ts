export type DashboardOrderInput = {
  id: string;
  status: string;
  total: number | { toString(): string };
  createdAt: Date | string;
  payments: Array<{ status: string; amount: number | { toString(): string } }>;
  items: Array<{
    productId: string;
    nameFr: string;
    nameEn: string;
    qty: number;
    lineTotal: number | { toString(): string };
    imageUrl?: string | null;
    unitsPerPack?: number;
  }>;
};

const REVENUE_STATUSES = new Set([
  "paymentConfirmed",
  "stockReserved",
  "fraudCheck",
  "preparing",
  "packed",
  "controlDone",
  "shipped",
  "in_transit",
  "out_for_delivery",
  "delivering",
  "delivered",
]);

const WORKFLOW_STATUSES = {
  validate: new Set(["cart", "validated", "paymentPending", "paymentConfirmed", "stockReserved", "fraudCheck", "awaitingClient", "replacement"]),
  prepare: new Set(["preparing", "packed", "controlDone"]),
  deliver: new Set(["shipped", "in_transit", "out_for_delivery", "delivering"]),
  closed: new Set(["delivered", "cancelled", "failed", "refunded"]),
} as const;

const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const numeric = (value: number | { toString(): string }) => Number(value);

export function netOrderRevenue(order: DashboardOrderInput) {
  if (["cart", "cancelled", "failed", "refunded"].includes(order.status)) return 0;
  const captured = order.payments.filter((payment) => payment.status === "captured").reduce((sum, payment) => sum + numeric(payment.amount), 0);
  const refunded = order.payments.filter((payment) => payment.status === "refunded").reduce((sum, payment) => sum + numeric(payment.amount), 0);
  if (captured > 0 || refunded > 0) return roundMoney(Math.max(0, captured - refunded));
  return REVENUE_STATUSES.has(order.status) ? roundMoney(numeric(order.total)) : 0;
}

export function summarizeRevenueWindow(orders: DashboardOrderInput[]) {
  let revenue = 0;
  let orderCount = 0;
  for (const order of orders) {
    const orderRevenue = netOrderRevenue(order);
    if (orderRevenue <= 0) continue;
    revenue += orderRevenue;
    orderCount += 1;
  }
  return {
    revenue: roundMoney(revenue),
    orders: orderCount,
    averageBasket: orderCount ? roundMoney(revenue / orderCount) : 0,
  };
}

export function buildDailyPulse(orders: DashboardOrderInput[], now: Date, locale: "fr" | "en") {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (6 - index)));
    return {
      key: date.toISOString().slice(0, 10),
      date: date.toISOString(),
      label: new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", { weekday: "short", timeZone: "UTC" }).format(date).replace(".", ""),
      revenue: 0,
      orders: 0,
    };
  });
  const dayByKey = new Map(days.map((day) => [day.key, day]));

  for (const order of orders) {
    const day = dayByKey.get(new Date(order.createdAt).toISOString().slice(0, 10));
    const revenue = netOrderRevenue(order);
    if (!day || revenue <= 0) continue;
    day.revenue = roundMoney(day.revenue + revenue);
    day.orders += 1;
  }

  return days.map(({ key: _key, ...day }) => day);
}

export function groupOrderWorkflow(statusCounts: Record<string, number>) {
  return (Object.keys(WORKFLOW_STATUSES) as Array<keyof typeof WORKFLOW_STATUSES>).map((id) => ({
    id,
    count: Object.entries(statusCounts).reduce((sum, [status, count]) => sum + (WORKFLOW_STATUSES[id].has(status) ? count : 0), 0),
  }));
}

export function rankTopProducts(orders: DashboardOrderInput[], locale: "fr" | "en", limit = 4) {
  const products = new Map<string, { productId: string; name: string; imageUrl: string | null; units: number; revenue: number }>();

  for (const order of orders) {
    const orderRevenue = netOrderRevenue(order);
    const orderTotal = numeric(order.total);
    if (orderRevenue <= 0 || orderTotal <= 0) continue;
    const settlementRatio = Math.min(1, orderRevenue / orderTotal);
    for (const item of order.items) {
      const current = products.get(item.productId) || {
        productId: item.productId,
        name: locale === "fr" ? item.nameFr : item.nameEn,
        imageUrl: item.imageUrl || null,
        units: 0,
        revenue: 0,
      };
      current.units += item.qty * Math.max(1, item.unitsPerPack || 1);
      current.revenue = roundMoney(current.revenue + numeric(item.lineTotal) * settlementRatio);
      if (!current.imageUrl && item.imageUrl) current.imageUrl = item.imageUrl;
      products.set(item.productId, current);
    }
  }

  return Array.from(products.values())
    .sort((left, right) => right.units - left.units || right.revenue - left.revenue)
    .slice(0, limit);
}
