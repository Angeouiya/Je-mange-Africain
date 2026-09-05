import { NextRequest, NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { PromotionAdminInput, promotionData } from "@/lib/promotion-policy";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await authorizeAdminRequest(request, { module: "marketing", action: "update" });
  if (!authorization.ok) return authorization.response;
  const parsed = PromotionAdminInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "La promotion est incomplète ou invalide.", details: parsed.error.flatten() }, { status: 400 });
  const { id } = await params;
  const before = await db.promotion.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Promotion introuvable." }, { status: 404 });

  try {
    const promotion = await db.$transaction(async (transaction) => {
      const updated = await transaction.promotion.update({ where: { id }, data: promotionData(parsed.data) });
      await transaction.auditLog.create({
        data: {
          action: before.active !== parsed.data.active ? "promotion_status_change" : "promotion_update",
          entityType: "Promotion",
          entityId: id,
          before: JSON.stringify(before),
          after: JSON.stringify(parsed.data),
          reason: `${parsed.data.active ? "Activation ou mise à jour" : "Suspension"} par ${authorization.user.email}`,
          ip: clientIp(request),
        },
      });
      return updated;
    });
    return NextResponse.json({ promotion });
  } catch (error) {
    if (prismaCode(error) === "P2002") return NextResponse.json({ error: "Ce code promotionnel existe déjà." }, { status: 409 });
    return NextResponse.json({ error: "La promotion n'a pas pu être mise à jour." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await authorizeAdminRequest(request, { module: "marketing", action: "delete" });
  if (!authorization.ok) return authorization.response;
  const { id } = await params;
  const before = await db.promotion.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Promotion introuvable." }, { status: 404 });
  if (before.usedCount > 0) {
    return NextResponse.json({ error: "Cette promotion a déjà été utilisée. Suspendez-la pour conserver son historique." }, { status: 409 });
  }

  await db.$transaction(async (transaction) => {
    await transaction.promotion.delete({ where: { id } });
    await transaction.auditLog.create({
      data: {
        action: "promotion_delete",
        entityType: "Promotion",
        entityId: id,
        before: JSON.stringify(before),
        reason: `Suppression d'un code jamais utilisé par ${authorization.user.email}`,
        ip: clientIp(request),
      },
    });
  });
  return NextResponse.json({ ok: true });
}

function prismaCode(error: unknown) {
  return typeof error === "object" && error && "code" in error ? String(error.code) : null;
}

function clientIp(request: NextRequest) {
  return request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
}
