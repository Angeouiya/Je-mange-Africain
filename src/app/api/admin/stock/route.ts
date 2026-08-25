import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authorizeAdminRequest } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authorization = await authorizeAdminRequest(req, { module: "stock", action: "read" });
  if (!authorization.ok) return authorization.response;
  const { searchParams } = new URL(req.url);
  const locale = (searchParams.get("locale") as "fr" | "en") || "fr";

  const batches = await db.inventoryBatch.findMany({
    orderBy: { expiryDate: "asc" },
    include: { product: { include: { translations: true } }, warehouse: true },
  });

  return NextResponse.json({
    batches: batches.map((b) => ({
      id: b.id,
      lotNumber: b.lotNumber,
      productId: b.productId,
      productName: b.product.translations.find((t) => t.locale === locale)?.name || b.product.traditionalName,
      quantity: b.quantity,
      reserved: b.reserved,
      expiryDate: b.expiryDate,
      receiptDate: b.receiptDate,
      costPrice: Number(b.costPrice),
      status: b.status,
      warehouse: b.warehouse?.name || null,
    })),
  });
}
