export function retailAvailableUnits(stockQty: number, reservedQty = 0) {
  const onHand = Math.max(0, Math.floor(Number(stockQty) || 0));
  const reserved = Math.max(0, Math.floor(Number(reservedQty) || 0));
  return Math.max(0, onHand - reserved);
}

export function inventoryPosition(stockQty: number, reservedQty = 0) {
  const onHandQty = Math.max(0, Math.floor(Number(stockQty) || 0));
  const reserved = Math.max(0, Math.floor(Number(reservedQty) || 0));
  return { onHandQty, reservedQty: reserved, availableQty: retailAvailableUnits(onHandQty, reserved) };
}
