import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const locale = (searchParams.get("locale") as "fr" | "en") || "fr";
  const cats = await db.category.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { products: true } } } });
  return NextResponse.json({
    categories: cats.map((c) => ({
      id: c.id, slug: c.slug,
      name: c[`name${locale === "en" ? "En" : "Fr"}`],
      nameFr: c.nameFr, nameEn: c.nameEn,
      description: c[`description${locale === "en" ? "En" : "Fr"}`],
      icon: c.icon, color: c.color, productCount: c._count.products,
    })),
  });
}
