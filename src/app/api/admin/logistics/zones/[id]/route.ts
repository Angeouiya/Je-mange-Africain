import { NextRequest, NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { DeliveryZoneInput, deliveryZoneData } from "@/lib/admin-logistics";
import { db } from "@/lib/db";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Context) {
  const authorization = await authorizeAdminRequest(request, { module: "logistics", action: "update" });
  if (!authorization.ok) return authorization.response;
  const { id } = await params;
  const parsed = DeliveryZoneInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "La zone de livraison est incomplète ou invalide.", details: parsed.error.flatten() }, { status: 400 });
  const [before, carrier] = await Promise.all([
    db.deliveryZone.findUnique({ where: { id } }),
    db.carrier.findUnique({ where: { id: parsed.data.carrierId } }),
  ]);
  if (!before) return NextResponse.json({ error: "Zone de livraison introuvable." }, { status: 404 });
  if (!carrier) return NextResponse.json({ error: "Le transporteur sélectionné n'existe plus." }, { status: 409 });

  const zone = await db.deliveryZone.update({ where: { id }, data: deliveryZoneData(parsed.data) });
  await db.auditLog.create({ data: { action: "delivery_zone_update", entityType: "DeliveryZone", entityId: id, before: JSON.stringify(before), after: JSON.stringify(parsed.data), reason: `Zone modifiée par ${authorization.user.email}` } });
  return NextResponse.json({ zone });
}

export async function DELETE(request: NextRequest, { params }: Context) {
  const authorization = await authorizeAdminRequest(request, { module: "logistics", action: "delete" });
  if (!authorization.ok) return authorization.response;
  const { id } = await params;
  const before = await db.deliveryZone.findUnique({ where: { id }, include: { carrier: true } });
  if (!before) return NextResponse.json({ error: "Zone de livraison introuvable." }, { status: 404 });
  await db.$transaction([
    db.auditLog.create({ data: { action: "delivery_zone_delete", entityType: "DeliveryZone", entityId: id, before: JSON.stringify(before), reason: `Zone supprimée par ${authorization.user.email}` } }),
    db.deliveryZone.delete({ where: { id } }),
  ]);
  return NextResponse.json({ ok: true });
}
