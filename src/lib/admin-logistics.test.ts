import { describe, expect, it } from "vitest";
import {
  DeliveryZoneInput,
  deliveryServiceDelayRange,
  deliveryServiceForDelay,
  deliveryZoneData,
} from "@/lib/admin-logistics";

describe("admin logistics contract", () => {
  it("classifies persisted routes into explicit customer services", () => {
    expect(deliveryServiceForDelay(12)).toBe("express");
    expect(deliveryServiceForDelay(24)).toBe("express");
    expect(deliveryServiceForDelay(25)).toBe("standard");
    expect(deliveryServiceForDelay(48)).toBe("standard");
    expect(deliveryServiceForDelay(72)).toBe("relay");
    expect(deliveryServiceDelayRange("relay")).toEqual([49, 336]);
  });

  it("refuses a delay outside its service promise", () => {
    const result = DeliveryZoneInput.safeParse({
      carrierId: "carrier-1",
      country: "France",
      postalPattern: "75*",
      service: "express",
      baseFee: 5,
      perKgFee: 0.5,
      frozenSurcharge: 2,
      minDelayHours: 48,
    });
    expect(result.success).toBe(false);
  });

  it("keeps relay routes outside the cold chain", () => {
    const result = DeliveryZoneInput.safeParse({
      carrierId: "carrier-1",
      country: "Belgique",
      postalPattern: "",
      service: "relay",
      baseFee: 3.5,
      perKgFee: 0.45,
      frozenSurcharge: 2,
      minDelayHours: 72,
    });
    expect(result.success).toBe(false);

    const valid = DeliveryZoneInput.parse({
      carrierId: "carrier-1",
      country: "Belgique",
      postalPattern: "",
      service: "relay",
      baseFee: 3.5,
      perKgFee: 0.45,
      frozenSurcharge: 0,
      minDelayHours: 72,
    });
    expect(deliveryZoneData(valid)).toMatchObject({ postalPattern: null, frozenSurcharge: 0 });
  });
});
