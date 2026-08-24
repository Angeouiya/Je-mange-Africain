import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const locale = (searchParams.get("locale") as "fr" | "en") || "fr";
  const customerId = searchParams.get("customerId");

  const where: any = {};
  if (customerId) where.customerId = customerId;

  const orders = await db.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      items: true,
      shipments: { include: { carrier: true } },
      timeline: { orderBy: { at: "asc" } },
      payments: true,
    },
  });

  return NextResponse.json({
    orders: orders.map((o) => ({
      id: o.id,
      number: o.number,
      status: o.status,
      subtotal: Number(o.subtotal),
      shippingCost: Number(o.shippingCost),
      vatAmount: Number(o.vatAmount),
      promoDiscount: Number(o.promoDiscount),
      total: Number(o.total),
      weightGrams: o.weightGrams,
      packageCount: o.packageCount,
      createdAt: o.createdAt,
      deliveryName: o.deliveryName,
      deliveryAddress: o.deliveryAddress,
      deliveryCity: o.deliveryCity,
      deliveryPostalCode: o.deliveryPostalCode,
      deliveryCountry: o.deliveryCountry,
      deliverySlot: o.deliverySlot,
      paymentMethod: o.paymentMethod,
      items: o.items.map((it) => ({
        id: it.id, productId: it.productId, nameFr: it.nameFr, nameEn: it.nameEn, sku: it.sku,
        unitPrice: Number(it.unitPrice), qty: it.qty, lineTotal: Number(it.lineTotal),
        thermalClass: it.thermalClass, recipeId: it.recipeId, recipeNameFr: it.recipeNameFr, recipeNameEn: it.recipeNameEn,
      })),
      shipments: o.shipments.map((s) => ({
        id: s.id, trackingNumber: s.trackingNumber, thermalClass: s.thermalClass, status: s.status,
        estimatedDelivery: s.estimatedDelivery, actualDelivery: s.actualDelivery, confirmCode: s.confirmCode,
        carrier: s.carrier?.name || null,
      })),
      timeline: o.timeline.map((e) => ({ status: e.status, label: e.label, at: e.at, actor: e.actor })),
      payments: o.payments.map((p) => ({ method: p.method, status: p.status, amount: Number(p.amount), reference: p.reference })),
    })),
  });
}
