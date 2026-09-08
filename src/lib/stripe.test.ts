import { afterEach, describe, expect, it, vi } from "vitest";

async function loadStripeModule() {
  vi.resetModules();
  return import("./stripe");
}

describe("Stripe production kill switch", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("keeps payments disabled even when a secret key is present", async () => {
    vi.stubEnv("PAYMENTS_ENABLED", "false");
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_present_but_disabled");

    const stripeModule = await loadStripeModule();

    expect(stripeModule.paymentsEnabled).toBe(false);
    expect(stripeModule.stripe).toBeNull();
    expect(stripeModule.stripeConfigurationError("fr")).toContain("temporairement désactivé");
  }, 15_000);

  it("fails closed when the switch is missing", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_present_without_switch");

    const stripeModule = await loadStripeModule();

    expect(stripeModule.paymentsEnabled).toBe(false);
    expect(stripeModule.stripe).toBeNull();
  }, 15_000);

  it("initializes Stripe only after an explicit enablement and a server key", async () => {
    vi.stubEnv("PAYMENTS_ENABLED", "true");
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_explicitly_enabled");

    const stripeModule = await loadStripeModule();

    expect(stripeModule.paymentsEnabled).toBe(true);
    expect(stripeModule.stripe).not.toBeNull();
  }, 15_000);
});
