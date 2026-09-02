import { describe, expect, it } from "vitest";
import {
  canTransitionOrder,
  fulfillmentReadinessIssue,
  nextFulfillmentStatus,
  orderFulfillmentInput,
  shipmentStatusForOrder,
} from "./admin-order-fulfillment";

const completeParcel = {
  carrier: "Chrono Frais",
  trackingNumber: "JMA-FR-260902",
  confirmCode: "4821",
  proofPhoto: "https://cdn.example.com/proof.jpg",
  signature: null,
};

describe("admin order fulfillment contract", () => {
  it("only exposes the next safe operational stage", () => {
    expect(nextFulfillmentStatus("preparing")).toBe("packed");
    expect(nextFulfillmentStatus("packed")).toBe("controlDone");
    expect(nextFulfillmentStatus("paymentPending")).toBeNull();
    expect(canTransitionOrder("preparing", "shipped")).toBe(false);
  });

  it("maps customer order stages to carrier parcel stages", () => {
    expect(shipmentStatusForOrder("controlDone")).toBe("created");
    expect(shipmentStatusForOrder("shipped")).toBe("picked_up");
    expect(shipmentStatusForOrder("delivered")).toBe("delivered");
  });

  it("requires transport metadata before hand-off", () => {
    expect(fulfillmentReadinessIssue("shipped", [])).toBe("parcel_required");
    expect(fulfillmentReadinessIssue("shipped", [{ ...completeParcel, carrier: null }])).toBe("carrier_required");
    expect(fulfillmentReadinessIssue("shipped", [{ ...completeParcel, trackingNumber: null }])).toBe("tracking_required");
  });

  it("requires a code and proof for the final delivery stages", () => {
    expect(fulfillmentReadinessIssue("out_for_delivery", [{ ...completeParcel, confirmCode: null }])).toBe("code_required");
    expect(fulfillmentReadinessIssue("delivered", [{ ...completeParcel, proofPhoto: null, signature: null }])).toBe("proof_required");
    expect(fulfillmentReadinessIssue("delivered", [completeParcel])).toBeNull();
  });

  it("validates an auditable logistics update", () => {
    const result = orderFulfillmentInput.safeParse({
      locale: "fr",
      status: "shipped",
      notes: "Double contrôle froid effectué.",
      shipment: {
        id: "parcel-1",
        carrier: "Chrono Frais",
        trackingNumber: "JMA-FR-260902",
        estimatedDelivery: "2026-09-04T14:00:00.000Z",
      },
    });

    expect(result.success).toBe(true);
  });
});
