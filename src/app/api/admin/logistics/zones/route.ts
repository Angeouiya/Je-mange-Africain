import { NextRequest, NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { DeliveryZoneInput, deliveryZoneData } from "@/lib/admin-logistics";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  const authorization = await authorizeAdminRequest(request, { module: "logistics", action: "create" });
  if (!authorization.ok) return authorization.response;
  const parsed = DeliveryZoneInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "La zone de livraison est incomplète ou invalide.", details: parsed.error.flatten() }, { status: 400 });
  const carrier = await db.carrier.findUnique({ where: { id: parsed.data.carrierId } });
  if (!carrier) return NextResponse.json({ error: "Le transporteur sélectionné n'existe plus." }, { status: 409 });

  const zone = await db.deliveryZone.create({ data: deliveryZoneData(parsed.data) });
  await db.auditLog.create({ data: { action: "delivery_zone_create", entityType: "DeliveryZone", entityId: zone.id, after: JSON.stringify(parsed.data), reason: `Zone créée par ${authorization.user.email}` } });
  return NextResponse.json({ zone }, { status: 201 });
}
