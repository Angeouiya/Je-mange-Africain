import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { calculateShippingOptions, DELIVERY_SERVICES } from "@/lib/shipping";

export const dynamic = "force-dynamic";

const ShippingQuoteRequest = z.object({
  weightGrams: z.number().int().min(0).max(1_000_000).default(0),
  thermalClasses: z.array(z.enum(["AMBIANT", "REFRIGERATED", "FROZEN"])).max(3).default([]),
  country: z.string().trim().min(2).max(80).default("France"),
  postalCode: z.string().trim().max(20).default(""),
  service: z.enum(DELIVERY_SERVICES).default("standard"),
});

export async function POST(req: NextRequest) {
  const parsed = ShippingQuoteRequest.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Paramètres de livraison invalides." }, { status: 400 });
  const options = await calculateShippingOptions(parsed.data);
  const selected = options.find((option) => option.service === parsed.data.service) || options[0];
  return NextResponse.json({ ...selected, options });
}
