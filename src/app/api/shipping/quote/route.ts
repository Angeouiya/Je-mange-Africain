import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { europeanCountryValue, europeanPostalCodeMessage, validateEuropeanPostalCode } from "@/lib/european-countries";
import { calculateShippingOptions, DELIVERY_SERVICES } from "@/lib/shipping";

export const dynamic = "force-dynamic";

const ShippingQuoteRequest = z.object({
  weightGrams: z.number().int().min(0).max(1_000_000).default(0),
  thermalClasses: z.array(z.enum(["AMBIANT", "REFRIGERATED", "FROZEN"])).max(3).default([]),
  country: z.string().trim().min(2).max(80).default("France"),
  postalCode: z.string().trim().max(20).default(""),
  service: z.enum(DELIVERY_SERVICES).default("standard"),
  locale: z.enum(["fr", "en"]).default("fr"),
});

export async function POST(req: NextRequest) {
  const parsed = ShippingQuoteRequest.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Paramètres de livraison invalides." }, { status: 400 });
  const postalValidation = validateEuropeanPostalCode(parsed.data.country, parsed.data.postalCode);
  if (!postalValidation.valid) {
    return NextResponse.json({
      error: europeanPostalCodeMessage(parsed.data.country, parsed.data.postalCode, parsed.data.locale),
      code: postalValidation.reason,
      expectedFormat: postalValidation.example,
    }, { status: 400 });
  }
  const destination = {
    ...parsed.data,
    country: europeanCountryValue(parsed.data.country)!,
    postalCode: postalValidation.normalized,
  };
  const options = await calculateShippingOptions(destination);
  const selected = options.find((option) => option.service === parsed.data.service) || options[0];
  return NextResponse.json({ ...selected, options });
}
