import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authorizeOrderAccess } from "@/lib/order-access";
import { getProductPhoto } from "@/lib/market-media";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await authorizeOrderAccess(req);
  if (!access) return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const locale = (searchParams.get("locale") as "fr" | "en") || "fr";

  const order = await db.order.findFirst({
    where: { id, ...(access.scope === "customer" ? { customerId: access.customerId || "__unassigned__" } : {}) },
    include: {
      items: true,
      shipments: { include: { carrier: true } },
      timeline: { orderBy: { at: "asc" } },
      payments: true,
    },
  });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const products = await db.product.findMany({ where: { id: { in: Array.from(new Set(order.items.map((item) => item.productId))) } }, include: { category: true, translations: true } });
  const productsById = new Map(products.map((product) => [product.id, product]));

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
      imageUrl: it.imageUrl || (() => {
        const product = productsById.get(it.productId);
        return getProductPhoto({ name: it.nameFr, traditionalName: product?.traditionalName, imageUrl: product?.imageUrl, imageEmoji: product?.imageEmoji, country: product?.country, category: product?.category });
      })(),
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
