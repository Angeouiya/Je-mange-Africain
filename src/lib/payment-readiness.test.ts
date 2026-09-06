import { describe, expect, it } from "vitest";
import { projectPaymentReadiness } from "./payment-readiness";

describe("payment provider readiness", () => {
  it("requires both card and PayPal for the requested European checkout baseline", () => {
    const readiness = projectPaymentReadiness({
      active: true,
      is_default: true,
      livemode: true,
      name: "Default",
      card: { available: true },
      paypal: { available: false },
      ideal: { available: true },
      bancontact: { available: true },
    }, "2026-09-06T12:00:00.000Z");

    expect(readiness).toMatchObject({ state: "attention", reachable: true, liveMode: true, card: true, paypal: false });
    expect(readiness.methods.filter((method) => method.available).map((method) => method.method)).toEqual(["card", "ideal", "bancontact"]);
  });

  it("reports a ready baseline without exposing provider credentials", () => {
    const readiness = projectPaymentReadiness({
      active: true,
      is_default: true,
      livemode: false,
      name: "Test configuration",
      card: { available: true },
      paypal: { available: true },
      apple_pay: { available: true },
      google_pay: { available: true },
    }, "2026-09-06T12:00:00.000Z");

    expect(readiness).toMatchObject({ state: "ready", liveMode: false, card: true, paypal: true, configurationName: "Test configuration" });
    expect(JSON.stringify(readiness)).not.toMatch(/secret|api[_-]?key|sk_/i);
  });
});
