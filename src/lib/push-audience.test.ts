import { describe, expect, it } from "vitest";
import { aggregatePushDelivery, pushCampaignReadiness, pushDeliveryPerformance } from "./push-audience";

describe("push campaign operations", () => {
  it("requires both languages, a reachable audience and a configured channel", () => {
    const draft = {
      titleFr: "Marché du week-end",
      bodyFr: "Une sélection ivoirienne est prête.",
      titleEn: "Weekend market",
      bodyEn: "An Ivorian selection is ready.",
    };

    expect(pushCampaignReadiness(draft, 184, true)).toMatchObject({ completed: 4, total: 4, percentage: 100, ready: true });
    expect(pushCampaignReadiness({ ...draft, bodyEn: "Short" }, 184, true)).toMatchObject({ completed: 3, percentage: 75, ready: false });
    expect(pushCampaignReadiness(draft, 0, true).checks.audience).toBe(false);
    expect(pushCampaignReadiness(draft, 184, false).checks.channel).toBe(false);
  });

  it("computes a precise delivery rate and operational state", () => {
    expect(pushDeliveryPerformance({ sent: true, recipientCount: 1_268, deliveredCount: 1_249, failedCount: 19 })).toEqual({
      recipients: 1_268,
      delivered: 1_249,
      failed: 19,
      deliveryRate: 98.5,
      failureRate: 1.5,
      state: "partial",
    });
  });

  it("distinguishes complete, failed and empty deliveries", () => {
    expect(pushDeliveryPerformance({ sent: true, recipientCount: 10, deliveredCount: 10, failedCount: 0 }).state).toBe("delivered");
    expect(pushDeliveryPerformance({ sent: false, recipientCount: 10, deliveredCount: 0, failedCount: 10 }).state).toBe("failed");
    expect(pushDeliveryPerformance({ sent: false, recipientCount: 0, deliveredCount: 0, failedCount: 0 }).state).toBe("empty");
  });

  it("aggregates recent deliveries without allowing inconsistent counts", () => {
    expect(aggregatePushDelivery([
      { sent: true, recipientCount: 100, deliveredCount: 96, failedCount: 4 },
      { sent: true, recipientCount: 50, deliveredCount: 55, failedCount: 2 },
    ])).toEqual({ recipients: 150, delivered: 150, failed: 0, deliveryRate: 100, failureRate: 0, state: "delivered" });
  });
});
