import { describe, expect, it } from "vitest";
import { netSettlementRatio, percentageChange, profitabilityWindow, shareOfTotal, weightedBatchUnitCost } from "@/lib/profitability";

describe("profitability periods", () => {
  const now = new Date("2026-09-03T14:30:00.000Z");

  it("builds comparable rolling windows", () => {
    const window = profitabilityWindow("30d", now);

    expect(window.current.start?.toISOString()).toBe("2026-08-04T14:30:00.000Z");
    expect(window.previous?.start.toISOString()).toBe("2026-07-05T14:30:00.000Z");
    expect(window.previous?.end.toISOString()).toBe("2026-08-04T14:30:00.000Z");
  });

  it("compares the same elapsed portion of each calendar month", () => {
    const window = profitabilityWindow("month", now);

    expect(window.current.start?.toISOString()).toBe("2026-09-01T00:00:00.000Z");
    expect(window.previous?.start.toISOString()).toBe("2026-08-01T00:00:00.000Z");
    expect(window.previous?.end.toISOString()).toBe("2026-08-03T14:30:00.000Z");
  });

  it("compares year-to-date against the same duration last year", () => {
    const window = profitabilityWindow("year", now);

    expect(window.current.start?.toISOString()).toBe("2026-01-01T00:00:00.000Z");
    expect(window.previous?.start.toISOString()).toBe("2025-01-01T00:00:00.000Z");
    expect(window.previous?.end.toISOString()).toBe("2025-09-03T14:30:00.000Z");
  });

  it("does not invent a comparison for all-time reporting", () => {
    expect(profitabilityWindow("all", now)).toEqual({ current: { start: null, end: now }, previous: null });
  });

  it("calculates readable changes and contributions", () => {
    expect(percentageChange(125, 100)).toBe(25);
    expect(percentageChange(75, 100)).toBe(-25);
    expect(percentageChange(75, 0)).toBeNull();
    expect(shareOfTotal(25, 200)).toBe(12.5);
    expect(shareOfTotal(25, 0)).toBe(0);
  });

  it("uses only physical quantities to weight actual batch cost", () => {
    const batches = [
      { quantity: 100, reserved: 80, costPrice: 2 },
      { quantity: 20, reserved: 0, costPrice: 4 },
    ];

    expect(weightedBatchUnitCost(batches)).toBeCloseTo(2.3333, 4);
  });

  it("removes completed refunds from settled revenue", () => {
    expect(netSettlementRatio(120, 0, 120)).toBe(1);
    expect(netSettlementRatio(120, 30, 120)).toBe(0.75);
    expect(netSettlementRatio(120, 120, 120)).toBe(0);
  });
});
