import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { AdvertisementInput, advertisementData } from "@/lib/advertising";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authorization = await authorizeAdminRequest(request, { module: "marketing", action: "read" });
  if (!authorization.ok) return authorization.response;
  const advertisements = await db.advertisement.findMany({ orderBy: [{ status: "asc" }, { priority: "desc" }, { updatedAt: "desc" }] });
  return NextResponse.json({ advertisements });
}

export async function POST(request: NextRequest) {
  const authorization = await authorizeAdminRequest(request, { module: "marketing", action: "create" });
  if (!authorization.ok) return authorization.response;
  const parsed = AdvertisementInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "L'affiche publicitaire est incomplète ou invalide.", details: parsed.error.flatten() }, { status: 400 });
  const advertisement = await db.advertisement.create({ data: { ...advertisementData(parsed.data), createdBy: authorization.user.email } });
  await db.auditLog.create({ data: { action: "advertisement_create", entityType: "Advertisement", entityId: advertisement.id, after: JSON.stringify(parsed.data), reason: `Création par ${authorization.user.email}` } });
  return NextResponse.json({ advertisement }, { status: 201 });
}
