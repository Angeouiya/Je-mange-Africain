import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ findMany: vi.fn() }));

vi.mock("@/lib/db", () => ({
  db: { deliveryZone: { findMany: mocks.findMany } },
}));

import { calculateShippingOptions, calculateShippingQuote } from "./shipping";

const zones = [
  { country: "France", postalPattern: null, baseFee: 4.9, perKgFee: 0.6, frozenSurcharge: 2.5, minDelayHours: 48, carrier: { name: "Chrono Frais" } },
  { country: "France", postalPattern: null, baseFee: 3.9, perKgFee: 0.5, frozenSurcharge: 2, minDelayHours: 72, carrier: { name: "DPD Express" } },
  { country: "France", postalPattern: "75*", baseFee: 0, perKgFee: 0.4, frozenSurcharge: 1.5, minDelayHours: 24, carrier: { name: "Flotte interne JMA" } },
];

describe("multi-zone shipping services", () => {
  beforeEach(() => mocks.findMany.mockResolvedValue(zones));

  it("selects the route whose delay matches each service and postcode", async () => {
    const options = await calculateShippingOptions({ country: "France", postalCode: "75011", weightGrams: 2_000, thermalClasses: ["AMBIANT"] });

    expect(options.find((option) => option.service === "express")).toMatchObject({ carrier: "Flotte interne JMA", fee: 0.8, minDelayHours: 12, maxDelayHours: 24, available: true });
    expect(options.find((option) => option.service === "standard")).toMatchObject({ carrier: "Chrono Frais", fee: 6.1, minDelayHours: 24, maxDelayHours: 48 });
    expect(options.find((option) => option.service === "relay")).toMatchObject({ carrier: "DPD Express", fee: 4.9, minDelayHours: 48, maxDelayHours: 72 });
  });

  it("does not apply a postcode-specific route outside its delivery area", async () => {
    const quote = await calculateShippingQuote({ country: "FR", postalCode: "69002", weightGrams: 1_000, service: "express" });

    expect(quote.carrier).toBe("Chrono Frais");
    expect(quote.fee).toBe(9.5);
  });

  it("disables collection points when chilled or frozen goods need a cold chain", async () => {
    const options = await calculateShippingOptions({ country: "France", postalCode: "75011", weightGrams: 1_000, thermalClasses: ["FROZEN"] });
    const relay = options.find((option) => option.service === "relay");

    expect(relay).toMatchObject({ available: false, unavailableReason: "cold_chain", fee: 0 });
  });

  it("uses the service fallback price once when a country has no configured route", async () => {
    mocks.findMany.mockResolvedValue([]);
    const quote = await calculateShippingQuote({ country: "Belgique", postalCode: "1000", weightGrams: 1_000, service: "express" });

    expect(quote).toMatchObject({ carrier: "JMA Express", fee: 10.8, minDelayHours: 12, maxDelayHours: 24 });
  });
});
