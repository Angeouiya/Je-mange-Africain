import { describe, expect, it } from "vitest";
import { formatEstimatedArrival } from "@/lib/delivery-experience";

describe("delivery experience", () => {
  const departure = new Date("2026-09-03T08:00:00.000Z");

  it("turns carrier hours into a customer-facing French date range", () => {
    const label = formatEstimatedArrival({ minDelayHours: 24, maxDelayHours: 48 }, "fr", departure);

    expect(label).toMatch(/^Entre /);
    expect(label).toContain("4 sept.");
    expect(label).toContain("5 sept.");
  });

  it("supports a same-day English delivery promise", () => {
    const label = formatEstimatedArrival({ minDelayHours: 1, maxDelayHours: 3 }, "en", departure);

    expect(label).toContain("3 Sept");
    expect(label).not.toContain("Between");
  });

  it("keeps a meaningful loading label while the quote is unavailable", () => {
    expect(formatEstimatedArrival(null, "fr", departure)).toBe("Délai en cours de calcul");
    expect(formatEstimatedArrival(undefined, "en", departure)).toBe("Delivery window being calculated");
  });
});
