export type ProfitabilityPeriod = "30d" | "month" | "year" | "all";

export type ProfitabilityWindow = {
  current: { start: Date | null; end: Date };
  previous: { start: Date; end: Date } | null;
};

const DAY_MS = 86_400_000;

export function profitabilityWindow(period: ProfitabilityPeriod, now = new Date()): ProfitabilityWindow {
  const end = new Date(now);
  if (period === "all") return { current: { start: null, end }, previous: null };

  if (period === "30d") {
    const start = new Date(end.getTime() - 30 * DAY_MS);
    return {
      current: { start, end },
      previous: { start: new Date(start.getTime() - 30 * DAY_MS), end: start },
    };
  }

  const year = end.getUTCFullYear();
  if (period === "month") {
    const start = new Date(Date.UTC(year, end.getUTCMonth(), 1));
    const previousStart = new Date(Date.UTC(year, end.getUTCMonth() - 1, 1));
    const elapsed = end.getTime() - start.getTime();
    return {
      current: { start, end },
      previous: {
        start: previousStart,
        end: new Date(Math.min(start.getTime(), previousStart.getTime() + elapsed)),
      },
    };
  }

  const start = new Date(Date.UTC(year, 0, 1));
  const previousStart = new Date(Date.UTC(year - 1, 0, 1));
  const elapsed = end.getTime() - start.getTime();
  return {
    current: { start, end },
    previous: { start: previousStart, end: new Date(Math.min(start.getTime(), previousStart.getTime() + elapsed)) },
  };
}

export function percentageChange(current: number, previous: number) {
  if (previous === 0) return null;
  return Math.round((((current - previous) / Math.abs(previous)) * 100 + Number.EPSILON) * 10) / 10;
}

export function shareOfTotal(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.round(((value / total) * 100 + Number.EPSILON) * 10) / 10;
}

export function netSettlementRatio(capturedAmount: number, refundedAmount: number, orderTotal: number) {
  if (orderTotal <= 0) return 1;
  return Math.min(1, Math.max(0, (capturedAmount - refundedAmount) / orderTotal));
}

export function weightedBatchUnitCost(batches: Array<{ quantity: number; costPrice: number }>) {
  const physicalQuantity = batches.reduce((sum, batch) => sum + Math.max(0, batch.quantity), 0);
  if (physicalQuantity === 0) return 0;
  return batches.reduce((sum, batch) => sum + Math.max(0, batch.quantity) * batch.costPrice, 0) / physicalQuantity;
}
