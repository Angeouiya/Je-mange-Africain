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
      cartes_bancaires: { available: true },
      paypal: { available: false },
      ideal: { available: true },
      bancontact: { available: true },
    }, "2026-09-06T12:00:00.000Z");

    expect(readiness).toMatchObject({ state: "attention", reachable: true, liveMode: true, card: true, paypal: false });
    expect(readiness.methods.filter((method) => method.available).map((method) => method.method)).toEqual(["card", "cartes_bancaires", "ideal", "bancontact"]);
    expect(readiness.methods.find((method) => method.method === "cartes_bancaires")).toMatchObject({ role: "local", markets: ["FR"] });
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
      bizum: { available: true },
      blik: { available: true },
      mobilepay: { available: true },
      satispay: { available: true },
    }, "2026-09-06T12:00:00.000Z");

    expect(readiness).toMatchObject({ state: "ready", liveMode: false, card: true, paypal: true, configurationName: "Test configuration" });
    expect(readiness.methods.find((method) => method.method === "bizum")).toMatchObject({ available: true, role: "local", markets: ["ES"] });
    expect(readiness.methods.find((method) => method.method === "blik")).toMatchObject({ available: true, role: "local", markets: ["PL"] });
    expect(readiness.methods.find((method) => method.method === "mobilepay")).toMatchObject({ available: true, role: "local", markets: ["DK", "FI"] });
    expect(readiness.methods.find((method) => method.method === "satispay")).toMatchObject({ available: true, role: "local", markets: ["IT"] });
    expect(readiness.methods.find((method) => method.method === "twint")).toMatchObject({ available: false, role: "local", markets: ["CH"] });
    expect(JSON.stringify(readiness)).not.toMatch(/secret|api[_-]?key|sk_/i);
  });
});
