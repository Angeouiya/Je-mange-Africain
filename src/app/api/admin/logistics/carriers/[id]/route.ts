import { NextRequest, NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { CarrierInput, carrierData } from "@/lib/admin-logistics";
import { db } from "@/lib/db";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Context) {
  const authorization = await authorizeAdminRequest(request, { module: "logistics", action: "update" });
  if (!authorization.ok) return authorization.response;
  const { id } = await params;
  const parsed = CarrierInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Le transporteur est incomplet ou invalide.", details: parsed.error.flatten() }, { status: 400 });
  const before = await db.carrier.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Transporteur introuvable." }, { status: 404 });
  const duplicate = await db.carrier.findFirst({ where: { name: parsed.data.name, NOT: { id } } });
  if (duplicate) return NextResponse.json({ error: "Un transporteur porte déjà ce nom." }, { status: 409 });

  const carrier = await db.carrier.update({ where: { id }, data: carrierData(parsed.data) });
  await db.auditLog.create({ data: { action: "carrier_update", entityType: "Carrier", entityId: id, before: JSON.stringify(before), after: JSON.stringify(parsed.data), reason: `Transporteur modifié par ${authorization.user.email}` } });
  return NextResponse.json({ carrier });
}

export async function DELETE(request: NextRequest, { params }: Context) {
  const authorization = await authorizeAdminRequest(request, { module: "logistics", action: "delete" });
  if (!authorization.ok) return authorization.response;
  const { id } = await params;
  const carrier = await db.carrier.findUnique({ where: { id }, include: { _count: { select: { shipments: true, zones: true } } } });
  if (!carrier) return NextResponse.json({ error: "Transporteur introuvable." }, { status: 404 });
  if (carrier._count.shipments || carrier._count.zones) {
    return NextResponse.json({ error: "Retirez d'abord ses zones. Un transporteur déjà utilisé par une commande doit rester dans l'historique." }, { status: 409 });
  }
  await db.$transaction([
    db.auditLog.create({ data: { action: "carrier_delete", entityType: "Carrier", entityId: id, before: JSON.stringify(carrier), reason: `Transporteur supprimé par ${authorization.user.email}` } }),
    db.carrier.delete({ where: { id } }),
  ]);
  return NextResponse.json({ ok: true });
}
