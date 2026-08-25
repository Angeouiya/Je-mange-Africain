import { NextRequest, NextResponse } from "next/server";
import { calculateShippingQuote } from "@/lib/shipping";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { weightGrams, thermalClasses, country } = await req.json();
  return NextResponse.json(await calculateShippingQuote({ weightGrams, thermalClasses, country }));
}
