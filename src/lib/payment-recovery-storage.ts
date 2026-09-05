export const PAYMENT_RECOVERY_STORAGE_KEY = "jma-payment-recovery-v1";
export const PAYMENT_RECOVERY_MAX_AGE_MS = 24 * 60 * 60 * 1_000;

export type PaymentRecovery = {
  status: "refund_submitted" | "finalization_pending";
  reference: string;
  refundStatus?: string | null;
};

type RecoveryState = {
  version: 1;
  createdAt: number;
  recovery: PaymentRecovery;
};

type RecoveryStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function rememberPaymentRecovery(recovery: PaymentRecovery, storage = browserSessionStorage()) {
  if (!storage) return false;
  try {
    const state: RecoveryState = { version: 1, createdAt: Date.now(), recovery };
    storage.setItem(PAYMENT_RECOVERY_STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function readPaymentRecovery(storage = browserSessionStorage(), now = Date.now()) {
  if (!storage) return null;
  try {
    const raw = storage.getItem(PAYMENT_RECOVERY_STORAGE_KEY);
    if (!raw) return null;
    const state = JSON.parse(raw) as Partial<RecoveryState>;
    const recovery = state.recovery;
    const valid = state.version === 1
      && typeof state.createdAt === "number"
      && now >= state.createdAt
      && now - state.createdAt <= PAYMENT_RECOVERY_MAX_AGE_MS
      && Boolean(recovery)
      && ["refund_submitted", "finalization_pending"].includes(recovery?.status || "")
      && typeof recovery?.reference === "string"
      && recovery.reference.length > 0;
    if (!valid) {
      storage.removeItem(PAYMENT_RECOVERY_STORAGE_KEY);
      return null;
    }
    return recovery as PaymentRecovery;
  } catch {
    storage.removeItem(PAYMENT_RECOVERY_STORAGE_KEY);
    return null;
  }
}

export function clearPaymentRecovery(storage = browserSessionStorage()) {
  try {
    storage?.removeItem(PAYMENT_RECOVERY_STORAGE_KEY);
  } catch {
    // Session storage can be unavailable in restricted browser contexts.
  }
}

function browserSessionStorage(): RecoveryStorage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}
