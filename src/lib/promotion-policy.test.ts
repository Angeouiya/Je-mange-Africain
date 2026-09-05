import { describe, expect, it } from "vitest";
import { evaluatePromotion, PromotionAdminInput, promotionLifecycle } from "./promotion-policy";

const activePromotion = {
  type: "percent",
  value: 10,
  minOrder: 30,
  appliesTo: "all",
  targetId: null,
  startsAt: "2026-09-01T00:00:00.000Z",
  endsAt: "2026-09-30T23:59:59.000Z",
  usageLimit: 100,
  usedCount: 12,
  active: true,
};

describe("promotion policy", () => {
  it("normalizes a guarded administration payload", () => {
    const result = PromotionAdminInput.parse({ ...activePromotion, code: " bienvenue-10 ", startsAt: activePromotion.startsAt, endsAt: activePromotion.endsAt });
    expect(result.code).toBe("BIENVENUE-10");
    expect(result.value).toBe(10);
  });

  it("rejects unsafe percentages, missing targets and reversed schedules", () => {
    expect(PromotionAdminInput.safeParse({ ...activePromotion, code: "TEST", value: 100 }).success).toBe(false);
    expect(PromotionAdminInput.safeParse({ ...activePromotion, code: "TEST", appliesTo: "product", targetId: null }).success).toBe(false);
    expect(PromotionAdminInput.safeParse({ ...activePromotion, code: "TEST", startsAt: activePromotion.endsAt, endsAt: activePromotion.startsAt }).success).toBe(false);
  });

  it("distinguishes scheduled, expired, paused and exhausted campaigns", () => {
    expect(promotionLifecycle(activePromotion, "2026-08-30T00:00:00.000Z")).toBe("scheduled");
    expect(promotionLifecycle(activePromotion, "2026-10-01T00:00:00.000Z")).toBe("expired");
    expect(promotionLifecycle({ ...activePromotion, active: false }, "2026-09-10T00:00:00.000Z")).toBe("paused");
    expect(promotionLifecycle({ ...activePromotion, usedCount: 100 }, "2026-09-10T00:00:00.000Z")).toBe("exhausted");
  });

  it("calculates discounts only on eligible product and category lines", () => {
    const lines = [
      { productId: "attieke", categoryId: "staples", lineTotal: 40 },
      { productId: "piment", categoryId: "spices", lineTotal: 10 },
    ];
    expect(evaluatePromotion({ ...activePromotion, appliesTo: "product", targetId: "attieke" }, { subtotal: 50, lines, now: "2026-09-10T00:00:00.000Z" })).toMatchObject({ valid: true, discount: 4, eligibleSubtotal: 40 });
    expect(evaluatePromotion({ ...activePromotion, type: "fixed", value: 20, appliesTo: "category", targetId: "spices" }, { subtotal: 50, lines, now: "2026-09-10T00:00:00.000Z" })).toMatchObject({ valid: true, discount: 10, eligibleSubtotal: 10 });
  });

  it("enforces country targets, basket minimums and quotas in both languages", () => {
    const countryOffer = { ...activePromotion, type: "free_shipping", value: 0, appliesTo: "country", targetId: "France" };
    expect(evaluatePromotion(countryOffer, { subtotal: 40, country: "FR", now: "2026-09-10T00:00:00.000Z" })).toMatchObject({ valid: true, freeShipping: true });
    expect(evaluatePromotion(countryOffer, { subtotal: 40, country: "Belgium", locale: "en", now: "2026-09-10T00:00:00.000Z" })).toMatchObject({ valid: false, error: "This code does not apply to this selection." });
    expect(evaluatePromotion(activePromotion, { subtotal: 20, locale: "en", now: "2026-09-10T00:00:00.000Z" })).toMatchObject({ valid: false, error: "Minimum basket of €30.00." });
    expect(evaluatePromotion({ ...activePromotion, usedCount: 100 }, { subtotal: 50, now: "2026-09-10T00:00:00.000Z" })).toMatchObject({ valid: false, lifecycle: "exhausted" });
  });
});
