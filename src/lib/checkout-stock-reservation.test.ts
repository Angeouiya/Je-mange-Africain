import { describe, expect, it } from "vitest";
import { CheckoutStockReservationError, planCheckoutBatchAllocations } from "./checkout-stock-reservation";

describe("planCheckoutBatchAllocations", () => {
  it("allocates stock across active batches in the received order", () => {
    const allocations = planCheckoutBatchAllocations([
      { quantity: 10, reserved: 8 },
      { quantity: 9, reserved: 1 },
      { quantity: 12, reserved: 0 },
    ], 7);

    expect(allocations).toEqual([
      { batchIndex: 0, quantity: 2, beforeQty: 2, afterQty: 0 },
      { batchIndex: 1, quantity: 5, beforeQty: 8, afterQty: 3 },
    ]);
  });

  it("skips exhausted or over-reserved batches", () => {
    const allocations = planCheckoutBatchAllocations([
      { quantity: 5, reserved: 5 },
      { quantity: 4, reserved: 7 },
      { quantity: 6, reserved: 2 },
    ], 3);

    expect(allocations).toEqual([
      { batchIndex: 2, quantity: 3, beforeQty: 4, afterQty: 1 },
    ]);
  });

  it("fails when active batches cannot cover the reservation", () => {
    expect(() => planCheckoutBatchAllocations([
      { quantity: 3, reserved: 1 },
      { quantity: 2, reserved: 2 },
    ], 4)).toThrow(CheckoutStockReservationError);
  });
});
