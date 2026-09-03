import { describe, expect, it } from "vitest";
import { customerSegment, NON_COMMERCIAL_ORDER_STATUSES } from "@/lib/customer-analytics";

const now = new Date("2026-09-02T12:00:00.000Z");

describe("customerSegment", () => {
  it("excludes non-commercial outcomes from relationship value", () => {
    expect(NON_COMMERCIAL_ORDER_STATUSES).toEqual(["cart", "cancelled", "failed", "refunded"]);
  });

  it("identifies profiles that have not purchased yet", () => {
    expect(customerSegment({ orders: 0, lifetimeValue: 0, loyalty: 0, now })).toBe("new");
  });

  it("prioritizes customers whose last purchase is old", () => {
    expect(customerSegment({ orders: 8, lifetimeValue: 500, loyalty: 1400, lastOrderAt: "2026-06-01T12:00:00.000Z", now })).toBe("at_risk");
  });

  it("recognizes high-value ambassadors", () => {
    expect(customerSegment({ orders: 5, lifetimeValue: 220, loyalty: 400, lastOrderAt: "2026-08-25T12:00:00.000Z", now })).toBe("ambassador");
    expect(customerSegment({ orders: 2, lifetimeValue: 340, loyalty: 200, lastOrderAt: "2026-08-25T12:00:00.000Z", now })).toBe("ambassador");
  });

  it("keeps recent repeat customers active", () => {
    expect(customerSegment({ orders: 2, lifetimeValue: 98, loyalty: 260, lastOrderAt: "2026-08-30T12:00:00.000Z", now })).toBe("active");
  });
});
