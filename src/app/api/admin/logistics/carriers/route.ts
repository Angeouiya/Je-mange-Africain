import { NextRequest, NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { CarrierInput, carrierData } from "@/lib/admin-logistics";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  const authorization = await authorizeAdminRequest(request, { module: "logistics", action: "create" });
  if (!authorization.ok) return authorization.response;
  const parsed = CarrierInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Le transporteur est incomplet ou invalide.", details: parsed.error.flatten() }, { status: 400 });

  const duplicate = await db.carrier.findFirst({ where: { name: parsed.data.name } });
  if (duplicate) return NextResponse.json({ error: "Un transporteur porte déjà ce nom." }, { status: 409 });

  const carrier = await db.carrier.create({ data: carrierData(parsed.data) });
  await db.auditLog.create({ data: { action: "carrier_create", entityType: "Carrier", entityId: carrier.id, after: JSON.stringify(parsed.data), reason: `Transporteur créé par ${authorization.user.email}` } });
  return NextResponse.json({ carrier }, { status: 201 });
}
