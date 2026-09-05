import { db } from "@/lib/db";
import { europeanCountryCode, europeanCountryLabel, europeanCountryValue } from "@/lib/european-countries";

export const DELIVERY_SERVICES = ["standard", "express", "relay"] as const;
export type DeliveryService = (typeof DELIVERY_SERVICES)[number];

interface ShippingQuoteInput {
  country?: string;
  postalCode?: string;
  weightGrams?: number;
  thermalClasses?: string[];
  service?: DeliveryService;
}

export interface ShippingQuote {
  service: DeliveryService;
  fee: number;
  carrier: string;
  packages: number;
  minDelayHours: number;
  maxDelayHours: number;
  available: boolean;
  unavailableReason: "cold_chain" | null;
  breakdown: {
    baseFee: number;
    weightFee: number;
    frozenSurcharge: number;
    serviceAdjustment: number;
  };
}

type PricedZone = {
  carrier: string;
  baseFee: number;
  perKg: number;
  frozen: number;
  fee: number;
  minDelayHours: number;
};

export async function calculateShippingOptions({
  country = "France",
  postalCode = "",
  weightGrams = 0,
  thermalClasses = [],
}: Omit<ShippingQuoteInput, "service">): Promise<ShippingQuote[]> {
  const canonicalCountry = europeanCountryValue(country) || country.trim();
  const normalizedCountry = normalizeCountry(canonicalCountry);
  const zones = await db.deliveryZone.findMany({
    where: { country: { in: countryCandidates(canonicalCountry) } },
    include: { carrier: true },
  });
  const hasFrozen = thermalClasses.includes("FROZEN");
  const hasColdChain = hasFrozen || thermalClasses.includes("REFRIGERATED");
  const weightKg = Math.max(0, weightGrams) / 1000;
  const routes: PricedZone[] = zones
    .filter((zone) => normalizeCountry(zone.country) === normalizedCountry && postalCodeMatches(zone.postalPattern, postalCode))
    .map((zone) => {
      const baseFee = Number(zone.baseFee);
      const perKg = Number(zone.perKgFee);
      const frozen = hasFrozen ? Number(zone.frozenSurcharge) : 0;
      return {
        carrier: zone.carrier?.name || "Transporteur",
        baseFee,
        perKg,
        frozen,
        fee: baseFee + perKg * weightKg + frozen,
        minDelayHours: zone.minDelayHours,
      };
    });

  return DELIVERY_SERVICES.map((service) => {
    const exactRoutes = routes.filter((route) => matchesServiceDelay(service, route.minDelayHours));
    const selectedRoute = selectRoute(exactRoutes.length ? exactRoutes : routes, service);
    const selected = selectedRoute || fallbackRoute(service, weightKg, hasFrozen);
    const exactMatch = exactRoutes.includes(selected);
    const serviceAdjustment = selectedRoute && !exactMatch ? fallbackAdjustment(service) : 0;
    const available = service !== "relay" || !hasColdChain;
    const [minDelayHours, maxDelayHours] = serviceWindow(service, selected.minDelayHours);

    return {
      service,
      fee: available ? roundMoney(Math.max(0, selected.fee + serviceAdjustment)) : 0,
      carrier: selected.carrier,
      packages: thermalClasses.length || 1,
      minDelayHours,
      maxDelayHours,
      available,
      unavailableReason: available ? null : "cold_chain",
      breakdown: {
        baseFee: selected.baseFee,
        weightFee: roundMoney(selected.perKg * weightKg),
        frozenSurcharge: selected.frozen,
        serviceAdjustment,
      },
    } satisfies ShippingQuote;
  });
}

export async function calculateShippingQuote(input: ShippingQuoteInput): Promise<ShippingQuote> {
  const service = input.service || "standard";
  const options = await calculateShippingOptions(input);
  return options.find((option) => option.service === service) || options[0];
}

function selectRoute(routes: PricedZone[], service: DeliveryService) {
  if (!routes.length) return null;
  return [...routes].sort((left, right) => {
    if (service === "express") return left.minDelayHours - right.minDelayHours || left.fee - right.fee;
    if (service === "relay") return right.minDelayHours - left.minDelayHours || left.fee - right.fee;
    return left.fee - right.fee || left.minDelayHours - right.minDelayHours;
  })[0];
}

function matchesServiceDelay(service: DeliveryService, delay: number) {
  if (service === "express") return delay <= 24;
  if (service === "relay") return delay > 48;
  return delay > 24 && delay <= 48;
}

function fallbackRoute(service: DeliveryService, weightKg: number, hasFrozen: boolean): PricedZone {
  const profile = service === "express"
    ? { carrier: "JMA Express", baseFee: 9.9, perKg: 0.9, frozen: hasFrozen ? 3.5 : 0, delay: 24 }
    : service === "relay"
      ? { carrier: "Point Relais Europe", baseFee: 3.5, perKg: 0.45, frozen: 0, delay: 72 }
      : { carrier: "Chrono Frais", baseFee: 4.9, perKg: 0.6, frozen: hasFrozen ? 2.5 : 0, delay: 48 };
  return { ...profile, fee: profile.baseFee + profile.perKg * weightKg + profile.frozen, minDelayHours: profile.delay };
}

function fallbackAdjustment(service: DeliveryService) {
  if (service === "express") return 4;
  if (service === "relay") return -1.5;
  return 0;
}

function serviceWindow(service: DeliveryService, routeDelay: number): [number, number] {
  if (service === "express") return [12, Math.max(12, Math.min(24, routeDelay))];
  if (service === "relay") return [48, Math.max(72, routeDelay)];
  const maximum = Math.max(48, routeDelay);
  return [Math.max(24, maximum - 24), maximum];
}

function postalCodeMatches(pattern: string | null, postalCode: string) {
  if (!pattern) return true;
  const normalizedPostalCode = postalCode.replace(/[\s-]/g, "").toUpperCase();
  if (!normalizedPostalCode) return false;
  const normalizedPattern = pattern.replace(/[\s-]/g, "").toUpperCase();
  const expression = normalizedPattern.split("*").map(escapeRegExp).join(".*");
  return new RegExp(`^${expression}$`).test(normalizedPostalCode);
}

function normalizeCountry(country: string) {
  return (europeanCountryValue(country) || country)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function countryCandidates(country: string) {
  const canonical = europeanCountryValue(country);
  const code = europeanCountryCode(country);
  const english = canonical ? europeanCountryLabel(canonical, "en") : null;
  const values = [country, canonical, english, code].filter((value): value is string => Boolean(value));
  return [...new Set(values.flatMap((value) => [value, value.toLowerCase()]))];
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
