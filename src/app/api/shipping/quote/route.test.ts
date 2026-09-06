import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ calculateShippingOptions: vi.fn() }));

vi.mock("@/lib/shipping", () => ({
  DELIVERY_SERVICES: ["standard", "express", "relay"],
  calculateShippingOptions: mocks.calculateShippingOptions,
}));

import { POST } from "./route";

function request(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/shipping/quote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/shipping/quote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.calculateShippingOptions.mockResolvedValue([
      { service: "standard", fee: 8.5, carrier: "DPD Europe", available: true },
      { service: "express", fee: 12.9, carrier: "DHL Express", available: true },
    ]);
  });

  it("normalizes the European country and postcode before quoting", async () => {
    const response = await POST(request({ country: "Netherlands", postalCode: "1012ab", locale: "en", weightGrams: 2_000 }));

    expect(response.status).toBe(200);
    expect(mocks.calculateShippingOptions).toHaveBeenCalledWith(expect.objectContaining({ country: "Pays-Bas", postalCode: "1012 AB", weightGrams: 2_000 }));
  });

  it("rejects a postcode that does not match the selected country", async () => {
    const response = await POST(request({ country: "Allemagne", postalCode: "7501", locale: "fr" }));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({ code: "invalid_format", expectedFormat: "10115" });
    expect(payload.error).toContain("Format attendu pour Allemagne");
    expect(mocks.calculateShippingOptions).not.toHaveBeenCalled();
  });
});
