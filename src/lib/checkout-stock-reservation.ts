export type CheckoutReservableBatch = {
  quantity: number;
  reserved: number;
};

export type CheckoutBatchAllocation = {
  batchIndex: number;
  quantity: number;
  beforeQty: number;
  afterQty: number;
};

export class CheckoutStockReservationError extends Error {
  constructor(
    public readonly requiredUnits: number,
    public readonly allocatedUnits: number,
  ) {
    super("Insufficient active batch stock.");
  }
}

export function planCheckoutBatchAllocations(
  batches: readonly CheckoutReservableBatch[],
  requiredUnits: number,
): CheckoutBatchAllocation[] {
  if (!Number.isInteger(requiredUnits) || requiredUnits < 1) {
    throw new CheckoutStockReservationError(Math.max(0, Math.trunc(requiredUnits || 0)), 0);
  }

  let remaining = requiredUnits;
  const allocations: CheckoutBatchAllocation[] = [];

  batches.forEach((batch, batchIndex) => {
    if (remaining <= 0) return;
    const available = Math.max(0, batch.quantity - batch.reserved);
    const quantity = Math.min(remaining, available);
    if (quantity <= 0) return;

    allocations.push({
      batchIndex,
      quantity,
      beforeQty: available,
      afterQty: available - quantity,
    });
    remaining -= quantity;
  });

  if (remaining > 0) throw new CheckoutStockReservationError(requiredUnits, requiredUnits - remaining);

  return allocations;
}
