import { describe, expect, it } from "vitest";
import {
  PAYMENT_RECOVERY_MAX_AGE_MS,
  PAYMENT_RECOVERY_STORAGE_KEY,
  clearPaymentRecovery,
  readPaymentRecovery,
  rememberPaymentRecovery,
} from "./payment-recovery-storage";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

describe("payment recovery storage", () => {
  it("keeps the recovery reference across a checkout refresh", () => {
    const storage = memoryStorage();
    const recovery = { status: "refund_submitted" as const, reference: "re_checkout_42", refundStatus: "pending" };

    expect(rememberPaymentRecovery(recovery, storage)).toBe(true);
    expect(readPaymentRecovery(storage)).toEqual(recovery);
  });

  it("expires stale recovery information", () => {
    const storage = memoryStorage();
    rememberPaymentRecovery({ status: "finalization_pending", reference: "pi_checkout_42" }, storage);
    const state = JSON.parse(storage.getItem(PAYMENT_RECOVERY_STORAGE_KEY) || "{}") as { createdAt: number };

    expect(readPaymentRecovery(storage, state.createdAt + PAYMENT_RECOVERY_MAX_AGE_MS + 1)).toBeNull();
    expect(storage.getItem(PAYMENT_RECOVERY_STORAGE_KEY)).toBeNull();
  });

  it("clears recovery after a new payment or a completed order", () => {
    const storage = memoryStorage();
    rememberPaymentRecovery({ status: "refund_submitted", reference: "re_checkout_42" }, storage);
    clearPaymentRecovery(storage);

    expect(storage.getItem(PAYMENT_RECOVERY_STORAGE_KEY)).toBeNull();
  });
});
