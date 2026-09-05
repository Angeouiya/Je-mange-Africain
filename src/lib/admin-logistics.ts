import { z } from "zod";
import type { DeliveryService } from "@/lib/shipping";

const optionalUrl = z.union([z.literal(""), z.string().trim().url().max(500)]).default("");
const identifier = z.string().trim().min(1).max(80);
const money = z.coerce.number().min(0).max(10_000);

export const CarrierInput = z.object({
  name: z.string().trim().min(2).max(100),
  trackingUrl: optionalUrl,
  logo: optionalUrl,
  rating: z.coerce.number().int().min(1).max(5),
});

export const DeliveryZoneInput = z.object({
  carrierId: identifier,
  country: z.string().trim().min(2).max(80),
  postalPattern: z.string().trim().max(30).default(""),
  service: z.enum(["standard", "express", "relay"]),
  baseFee: money,
  perKgFee: money,
  frozenSurcharge: money,
  minDelayHours: z.coerce.number().int().min(1).max(336),
}).superRefine((value, context) => {
  const [minimum, maximum] = deliveryServiceDelayRange(value.service);
  if (value.minDelayHours < minimum || value.minDelayHours > maximum) {
    context.addIssue({
      code: "custom",
      path: ["minDelayHours"],
      message: `Le délai ${value.service} doit être compris entre ${minimum} et ${maximum} heures.`,
    });
  }
  if (value.service === "relay" && value.frozenSurcharge !== 0) {
    context.addIssue({ code: "custom", path: ["frozenSurcharge"], message: "Le relais ne prend pas en charge la chaîne du froid." });
  }
});

export type CarrierValues = z.infer<typeof CarrierInput>;
export type DeliveryZoneValues = z.infer<typeof DeliveryZoneInput>;

export function deliveryServiceForDelay(delay: number): DeliveryService {
  if (delay <= 24) return "express";
  if (delay > 48) return "relay";
  return "standard";
}

export function deliveryServiceDelayRange(service: DeliveryService): [number, number] {
  if (service === "express") return [1, 24];
  if (service === "relay") return [49, 336];
  return [25, 48];
}

export function carrierData(values: CarrierValues) {
  return {
    name: values.name,
    trackingUrl: values.trackingUrl || null,
    logo: values.logo || null,
    rating: values.rating,
  };
}

export function deliveryZoneData(values: DeliveryZoneValues) {
  return {
    carrierId: values.carrierId,
    country: values.country,
    postalPattern: values.postalPattern || null,
    baseFee: values.baseFee,
    perKgFee: values.perKgFee,
    frozenSurcharge: values.service === "relay" ? 0 : values.frozenSurcharge,
    minDelayHours: values.minDelayHours,
  };
}
