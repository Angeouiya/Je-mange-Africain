import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { AdvertisementInput, advertisementData } from "@/lib/advertising";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await authorizeAdminRequest(request, { module: "marketing", action: "update" });
  if (!authorization.ok) return authorization.response;
  const parsed = AdvertisementInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "L'affiche publicitaire est incomplète ou invalide." }, { status: 400 });
  const { id } = await params;
  const before = await db.advertisement.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Publicité introuvable." }, { status: 404 });
  const advertisement = await db.advertisement.update({ where: { id }, data: advertisementData(parsed.data) });
  await db.auditLog.create({ data: { action: "advertisement_update", entityType: "Advertisement", entityId: id, before: JSON.stringify(before), after: JSON.stringify(parsed.data), reason: `Mise à jour par ${authorization.user.email}` } });
  return NextResponse.json({ advertisement });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await authorizeAdminRequest(request, { module: "marketing", action: "delete" });
  if (!authorization.ok) return authorization.response;
  const { id } = await params;
  const before = await db.advertisement.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Publicité introuvable." }, { status: 404 });
  await db.$transaction(async (transaction) => {
    await transaction.advertisement.delete({ where: { id } });
    await transaction.auditLog.create({ data: { action: "advertisement_delete", entityType: "Advertisement", entityId: id, before: JSON.stringify(before), reason: `Suppression par ${authorization.user.email}` } });
  });
  return NextResponse.json({ ok: true });
}
