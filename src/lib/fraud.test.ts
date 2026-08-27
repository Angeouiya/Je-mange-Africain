import { describe, expect, it } from "vitest";
import { assessCheckoutRisk } from "@/lib/fraud";

describe("assessCheckoutRisk", () => {
  it("keeps an ordinary grocery order at low risk", () => {
    expect(assessCheckoutRisk({
      total: 48.9,
      itemCount: 6,
      uniqueProducts: 5,
      email: "client@example.com",
      phone: "+33612345678",
      postalCode: "75011",
      recentAttempts: 1,
    })).toMatchObject({ score: 0, level: "low", requiresReview: false, signals: [] });
  });

  it("sends a high-value, repeated concentrated order to manual review", () => {
    const result = assessCheckoutRisk({
      total: 320,
      itemCount: 32,
      uniqueProducts: 1,
      email: "invalid",
      recentAttempts: 6,
    });
    expect(result.score).toBe(100);
    expect(result.level).toBe("high");
    expect(result.requiresReview).toBe(true);
    expect(result.signals).toEqual(expect.arrayContaining(["high_value", "large_quantity", "concentrated_cart", "payment_velocity"]));
  });
});
