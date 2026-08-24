import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const locale = (searchParams.get("locale") as "fr" | "en") || "fr";

  const order = await db.order.findUnique({
    where: { id },
    include: {
      items: true,
      shipments: { include: { carrier: true } },
      timeline: { orderBy: { at: "asc" } },
      payments: true,
    },
  });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    id: order.id,
    number: order.number,
    status: order.status,
    subtotal: Number(order.subtotal),
    shippingCost: Number(order.shippingCost),
    vatAmount: Number(order.vatAmount),
    promoDiscount: Number(order.promoDiscount),
    total: Number(order.total),
    weightGrams: order.weightGrams,
    packageCount: order.packageCount,
    createdAt: order.createdAt,
    deliveryName: order.deliveryName,
    deliveryAddress: order.deliveryAddress,
    deliveryCity: order.deliveryCity,
    deliveryPostalCode: order.deliveryPostalCode,
    deliveryCountry: order.deliveryCountry,
    deliverySlot: order.deliverySlot,
    paymentMethod: order.paymentMethod,
    items: order.items.map((it) => ({
      id: it.id, productId: it.productId,
      name: locale === "en" ? it.nameEn : it.nameFr,
      nameFr: it.nameFr, nameEn: it.nameEn, sku: it.sku,
      unitPrice: Number(it.unitPrice), qty: it.qty, lineTotal: Number(it.lineTotal),
      thermalClass: it.thermalClass, recipeId: it.recipeId,
      recipeName: locale === "en" ? it.recipeNameEn : it.recipeNameFr,
    })),
    shipments: order.shipments.map((s) => ({
      id: s.id, trackingNumber: s.trackingNumber, thermalClass: s.thermalClass, status: s.status,
      estimatedDelivery: s.estimatedDelivery, actualDelivery: s.actualDelivery, confirmCode: s.confirmCode,
      carrier: s.carrier?.name || null,
    })),
    timeline: order.timeline.map((e) => ({ status: e.status, label: e.label, at: e.at, actor: e.actor })),
    payments: order.payments.map((p) => ({ method: p.method, status: p.status, amount: Number(p.amount), reference: p.reference })),
  });
}
