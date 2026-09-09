import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authorizeAdminRequest } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authorization = await authorizeAdminRequest(request, { module: "catalog", action: "read" });
  if (!authorization.ok) return authorization.response;

  const locale = new URL(request.url).searchParams.get("locale") === "en" ? "en" : "fr";
  const categories = await db.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { products: true } } },
  });

  return NextResponse.json({
    categories: categories.map((category) => ({
      id: category.id,
      slug: category.slug,
      name: category[`name${locale === "en" ? "En" : "Fr"}`],
      nameFr: category.nameFr,
      nameEn: category.nameEn,
      description: category[`description${locale === "en" ? "En" : "Fr"}`],
      icon: category.icon,
      color: category.color,
      imageUrl: category.imageUrl,
      productCount: category._count.products,
      sortOrder: category.sortOrder,
    })),
  });
}
