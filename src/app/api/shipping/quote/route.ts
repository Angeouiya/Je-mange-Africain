import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { weightGrams, thermalClasses, postalCode, country } = await req.json();

  const zones = await db.deliveryZone.findMany({ where: { country: country || "France" }, include: { carrier: true }, orderBy: { baseFee: "asc" } });
  const hasFrozen = (thermalClasses || []).includes("FROZEN");

  let best = null as null | { fee: number; carrier: string; baseFee: number; perKg: number; frozen: number };
  for (const z of zones) {
    const fee = Number(z.baseFee) + Number(z.perKgFee) * ((weightGrams || 0) / 1000) + (hasFrozen ? Number(z.frozenSurcharge) : 0);
    if (!best || fee < best.fee) {
      best = { fee, carrier: z.carrier?.name || "Transporteur", baseFee: Number(z.baseFee), perKg: Number(z.perKgFee), frozen: Number(z.frozenSurcharge) };
    }
  }
  if (!best) {
    best = { fee: 4.9 + 0.6 * ((weightGrams || 0) / 1000) + (hasFrozen ? 2.5 : 0), carrier: "Chrono Frais", baseFee: 4.9, perKg: 0.6, frozen: 2.5 };
  }

  return NextResponse.json({
    fee: Math.round(best.fee * 100) / 100,
    carrier: best.carrier,
    packages: (thermalClasses || []).length || 1,
    breakdown: {
      baseFee: best.baseFee,
      weightFee: Math.round(best.perKg * ((weightGrams || 0) / 1000) * 100) / 100,
      frozenSurcharge: hasFrozen ? best.frozen : 0,
    },
  });
}
