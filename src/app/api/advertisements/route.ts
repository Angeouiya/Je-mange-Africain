import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const locale = searchParams.get("locale") === "en" ? "en" : "fr";
  const placement = ["home", "catalog", "recipes", "checkout"].includes(searchParams.get("placement") || "") ? searchParams.get("placement")! : "home";
  const now = new Date();
  const advertisements = await db.advertisement.findMany({
    where: {
      placement,
      status: "published",
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      ],
    },
    orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
    take: 5,
  });
  return NextResponse.json({ advertisements: advertisements.map((advertisement) => ({ id: advertisement.id, placement: advertisement.placement, title: locale === "en" ? advertisement.titleEn : advertisement.titleFr, body: locale === "en" ? advertisement.bodyEn : advertisement.bodyFr, imageUrl: advertisement.imageUrl, imageAlt: locale === "en" ? advertisement.imageAltEn : advertisement.imageAltFr, linkUrl: advertisement.linkUrl })) });
}
