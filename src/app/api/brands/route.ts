import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { jsonWithPublicApiCache } from "@/lib/public-api-cache";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const locale = (searchParams.get("locale") as "fr" | "en") || "fr";
  const brands = await db.brand.findMany({ include: { _count: { select: { products: true } } } });
  return jsonWithPublicApiCache({
    brands: brands.map((b) => ({
      id: b.id, slug: b.slug,
      name: b[`name${locale === "en" ? "En" : "Fr"}`],
      country: b.country, productCount: b._count.products,
    })),
  }, "storefrontReference");
}
