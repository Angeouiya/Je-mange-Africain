import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const locale = (searchParams.get("locale") as "fr" | "en") || "fr";

  const [totalProducts, outOfStock, batches, orders, customers] = await Promise.all([
    db.product.count({ where: { status: "published" } }),
    db.product.count({ where: { stockQty: { lte: 0 } } }),
    db.inventoryBatch.findMany({ where: { status: "active" }, include: { product: { include: { translations: true } } } }),
    db.order.findMany({ include: { items: true } }),
    db.customer.count(),
  ]);

  const now = Date.now();
  const expiringSoon = batches.filter((b) => b.expiryDate && new Date(b.expiryDate).getTime() - now < 14 * 86400000 && new Date(b.expiryDate) > new Date()).length;

  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const monthOrders = orders.filter((o) => o.createdAt >= monthStart);
  const monthRevenue = monthOrders.reduce((s, o) => s + Number(o.total), 0);
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayRevenue = orders.filter((o) => o.createdAt >= todayStart).reduce((s, o) => s + Number(o.total), 0);

  return NextResponse.json({
    kpis: {
      revenueToday: Math.round(todayRevenue * 100) / 100,
      revenueMonth: Math.round(monthRevenue * 100) / 100,
      orders: orders.length,
      monthOrders: monthOrders.length,
      avgBasket: monthOrders.length ? Math.round((monthRevenue / monthOrders.length) * 100) / 100 : 0,
      outOfStock,
      expiringSoon,
      customers,
      toPrepare: orders.filter((o) => ["paymentConfirmed", "stockReserved", "validated"].includes(o.status)).length,
    },
  });
}
