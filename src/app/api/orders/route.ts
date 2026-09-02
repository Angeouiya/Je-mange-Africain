import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authorizeOrderAccess } from "@/lib/order-access";
import { getProductPhoto } from "@/lib/market-media";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const access = await authorizeOrderAccess(req);
  if (!access) return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const locale = (searchParams.get("locale") as "fr" | "en") || "fr";

  const where: any = {};
  if (access.scope === "customer") {
    if (!access.customerId) return NextResponse.json({ orders: [] });
    where.customerId = access.customerId;
  }

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
  const productIds = Array.from(new Set(orders.flatMap((order) => order.items.map((item) => item.productId))));
  const orderProducts = productIds.length ? await db.product.findMany({ where: { id: { in: productIds } }, include: { category: true, translations: true } }) : [];
  const productsById = new Map(orderProducts.map((product) => [product.id, product]));

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
      ...(access.scope === "admin" ? { notes: o.notes } : {}),
      items: o.items.map((it) => ({
        id: it.id, productId: it.productId, nameFr: it.nameFr, nameEn: it.nameEn, sku: it.sku,
        unitPrice: Number(it.unitPrice), qty: it.qty, lineTotal: Number(it.lineTotal),
        thermalClass: it.thermalClass, recipeId: it.recipeId, recipeNameFr: it.recipeNameFr, recipeNameEn: it.recipeNameEn,
        imageUrl: it.imageUrl || (() => {
          const product = productsById.get(it.productId);
          return getProductPhoto({ name: it.nameFr, traditionalName: product?.traditionalName, imageUrl: product?.imageUrl, imageEmoji: product?.imageEmoji, country: product?.country, category: product?.category });
        })(),
      })),
      shipments: o.shipments.map((s) => ({
        id: s.id, trackingNumber: s.trackingNumber, thermalClass: s.thermalClass, status: s.status,
        estimatedDelivery: s.estimatedDelivery, actualDelivery: s.actualDelivery, confirmCode: s.confirmCode,
        carrier: s.carrier?.name || null,
        carrierName: s.carrier?.name || null, trackingUrl: s.carrier?.trackingUrl || null,
        proofPhoto: s.proofPhoto, signature: s.signature,
      })),
      timeline: o.timeline.map((e) => ({ status: e.status, label: e.label, at: e.at, actor: e.actor })),
      payments: o.payments.map((p) => ({ method: p.method, status: p.status, amount: Number(p.amount), reference: p.reference })),
    })),
  });
}
