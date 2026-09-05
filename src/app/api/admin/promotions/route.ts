import { NextRequest, NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { PromotionAdminInput, promotionData } from "@/lib/promotion-policy";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authorization = await authorizeAdminRequest(request, { module: "marketing", action: "read" });
  if (!authorization.ok) return authorization.response;
  const promotions = await db.promotion.findMany({ orderBy: [{ active: "desc" }, { createdAt: "desc" }] });
  return NextResponse.json({ promotions });
}

export async function POST(request: NextRequest) {
  const authorization = await authorizeAdminRequest(request, { module: "marketing", action: "create" });
  if (!authorization.ok) return authorization.response;
  const parsed = PromotionAdminInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "La promotion est incomplète ou invalide.", details: parsed.error.flatten() }, { status: 400 });

  try {
    const promotion = await db.$transaction(async (transaction) => {
      const created = await transaction.promotion.create({ data: promotionData(parsed.data) });
      await transaction.auditLog.create({
        data: {
          action: "promotion_create",
          entityType: "Promotion",
          entityId: created.id,
          after: JSON.stringify(parsed.data),
          reason: `Création par ${authorization.user.email}`,
          ip: clientIp(request),
        },
      });
      return created;
    });
    return NextResponse.json({ promotion }, { status: 201 });
  } catch (error) {
    if (prismaCode(error) === "P2002") return NextResponse.json({ error: "Ce code promotionnel existe déjà." }, { status: 409 });
    return NextResponse.json({ error: "La promotion n'a pas pu être enregistrée." }, { status: 500 });
  }
}

function prismaCode(error: unknown) {
  return typeof error === "object" && error && "code" in error ? String(error.code) : null;
}

function clientIp(request: NextRequest) {
  return request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
}
