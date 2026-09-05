import { describe, expect, it } from "vitest";
import { AdminRefundInput, isFullRefund, providerRefundStatus, refundAmounts, refundReasonLabel } from "./admin-refunds";

describe("admin refunds", () => {
  it("validates a documented two-decimal refund", () => {
    expect(AdminRefundInput.parse({
      amount: 12.45,
      reason: "damaged_item",
      note: "Colis photographié à la réception.",
      requestId: "32edee58-7e59-4e11-98d7-df9d51f0f270",
      locale: "fr",
    }).amount).toBe(12.45);
    expect(AdminRefundInput.safeParse({
      amount: 12.455,
      reason: "other",
      note: "Motif suffisamment documenté.",
      requestId: "32edee58-7e59-4e11-98d7-df9d51f0f270",
    }).success).toBe(false);
  });

  it("reserves completed and pending amounts before exposing the balance", () => {
    expect(refundAmounts(80, [
      { amount: 20, status: "completed" },
      { amount: 15.5, status: "pending" },
      { amount: 9, status: "rejected" },
    ])).toEqual({ completed: 20, pending: 15.5, committed: 35.5, refundable: 44.5 });
  });

  it("maps provider states and detects a full refund in cents", () => {
    expect(providerRefundStatus("succeeded")).toBe("completed");
    expect(providerRefundStatus("pending")).toBe("pending");
    expect(providerRefundStatus("failed")).toBe("rejected");
    expect(isFullRefund(48.7, 48.7)).toBe(true);
    expect(isFullRefund(48.7, 48.69)).toBe(false);
    expect(refundReasonLabel("delivery_incident", "en")).toBe("Delivery incident");
  });
});
