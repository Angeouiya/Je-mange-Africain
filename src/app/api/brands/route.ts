import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const locale = (searchParams.get("locale") as "fr" | "en") || "fr";
  const brands = await db.brand.findMany({ include: { _count: { select: { products: true } } } });
  return NextResponse.json({
    brands: brands.map((b) => ({
      id: b.id, slug: b.slug,
      name: b[`name${locale === "en" ? "En" : "Fr"}`],
      country: b.country, productCount: b._count.products,
    })),
  });
}
