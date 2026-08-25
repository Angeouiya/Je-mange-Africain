import { db } from "@/lib/db";

interface ShippingQuoteInput {
  country?: string;
  weightGrams?: number;
  thermalClasses?: string[];
}

export interface ShippingQuote {
  fee: number;
  carrier: string;
  packages: number;
  breakdown: {
    baseFee: number;
    weightFee: number;
    frozenSurcharge: number;
  };
}

export async function calculateShippingQuote({ country = "France", weightGrams = 0, thermalClasses = [] }: ShippingQuoteInput): Promise<ShippingQuote> {
  const zones = await db.deliveryZone.findMany({
    where: { country },
    include: { carrier: true },
    orderBy: { baseFee: "asc" },
  });
  const hasFrozen = thermalClasses.includes("FROZEN");
  const weightKg = weightGrams / 1000;

  let best: null | { fee: number; carrier: string; baseFee: number; perKg: number; frozen: number } = null;
  for (const zone of zones) {
    const baseFee = Number(zone.baseFee);
    const perKg = Number(zone.perKgFee);
    const frozen = hasFrozen ? Number(zone.frozenSurcharge) : 0;
    const fee = baseFee + perKg * weightKg + frozen;
    if (!best || fee < best.fee) {
      best = { fee, carrier: zone.carrier?.name || "Transporteur", baseFee, perKg, frozen };
    }
  }

  best ??= {
    fee: 4.9 + 0.6 * weightKg + (hasFrozen ? 2.5 : 0),
    carrier: "Chrono Frais",
    baseFee: 4.9,
    perKg: 0.6,
    frozen: hasFrozen ? 2.5 : 0,
  };

  return {
    fee: roundMoney(best.fee),
    carrier: best.carrier,
    packages: thermalClasses.length || 1,
    breakdown: {
      baseFee: best.baseFee,
      weightFee: roundMoney(best.perKg * weightKg),
      frozenSurcharge: best.frozen,
    },
  };
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}
