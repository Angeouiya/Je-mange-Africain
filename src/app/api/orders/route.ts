import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authorizeOrderAccess } from "@/lib/order-access";
import { getProductPhoto } from "@/lib/market-media";
import { wholesaleAvailablePacks, wholesalePriceForQuantity, wholesaleTiers } from "@/lib/wholesale";

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
      customer: { select: { user: { select: { email: true, phone: true } } } },
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
      currency: o.currency,
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
      customerEmail: o.deliveryEmail || o.customer?.user.email || null,
      customerPhone: o.deliveryPhone || o.customer?.user.phone || null,
      ...(access.scope === "admin" ? { notes: o.notes } : {}),
      items: o.items.map((it) => {
        const product = productsById.get(it.productId);
        const salesChannel = it.salesChannel === "wholesale" ? "wholesale" : "retail";
        const tiers = product && salesChannel === "wholesale" ? wholesaleTiers({ wholesaleMinPacks: product.wholesaleMinPacks, wholesalePrice: product.wholesalePrice === null ? null : Number(product.wholesalePrice), wholesaleTier2MinPacks: product.wholesaleTier2MinPacks, wholesaleTier2Price: product.wholesaleTier2Price === null ? null : Number(product.wholesaleTier2Price), wholesaleTier3MinPacks: product.wholesaleTier3MinPacks, wholesaleTier3Price: product.wholesaleTier3Price === null ? null : Number(product.wholesaleTier3Price) }) : [];
        const maxStock = product?.status === "published" ? (salesChannel === "wholesale" ? wholesaleAvailablePacks(product.stockQty, product.reservedQty, it.unitsPerPack) : Math.max(0, product.stockQty - product.reservedQty)) : 0;
        const currentUnitPrice = product ? (salesChannel === "wholesale" && product.isWholesale && tiers.length ? wholesalePriceForQuantity(tiers, it.qty) : Number(product.isOnSale && product.promoPrice ? product.promoPrice : product.price)) : Number(it.unitPrice);
        return {
          id: it.id, productId: it.productId, name: locale === "en" ? it.nameEn : it.nameFr, nameFr: it.nameFr, nameEn: it.nameEn, sku: it.sku,
          unitPrice: Number(it.unitPrice), currentUnitPrice, qty: it.qty, lineTotal: Number(it.lineTotal),
          thermalClass: it.thermalClass, recipeId: it.recipeId, recipeNameFr: it.recipeNameFr, recipeNameEn: it.recipeNameEn,
          recipeName: locale === "en" ? it.recipeNameEn : it.recipeNameFr,
          packWeightGrams: it.packWeightGrams || product?.netWeightGrams || 0,
          unitLabel: salesChannel === "wholesale" ? product?.wholesalePackLabel || "" : product?.packaging || "",
          salesChannel,
          unitsPerPack: it.unitsPerPack,
          minimumQty: salesChannel === "wholesale" ? product?.wholesaleMinPacks || 1 : 1,
          wholesaleTiers: tiers,
          maxStock,
          purchasable: salesChannel === "wholesale" ? Boolean(product?.isWholesale && maxStock >= (product.wholesaleMinPacks || 1) && tiers.length) : maxStock > 0,
          imageUrl: it.imageUrl || getProductPhoto({ name: it.nameFr, traditionalName: product?.traditionalName, imageUrl: product?.imageUrl, imageEmoji: product?.imageEmoji, country: product?.country, category: product?.category }),
        };
      }),
      shipments: o.shipments.map((s) => ({
        id: s.id, trackingNumber: s.trackingNumber, thermalClass: s.thermalClass, status: s.status,
        estimatedDelivery: s.estimatedDelivery, actualDelivery: s.actualDelivery, confirmCode: s.confirmCode,
        carrier: s.carrier?.name || null,
        carrierName: s.carrier?.name || null, trackingUrl: s.carrier?.trackingUrl || null,
        proofPhoto: s.proofPhoto, signature: s.signature,
      })),
      timeline: o.timeline.map((e) => ({ status: e.status, label: e.label, at: e.at, actor: access.scope === "admin" ? e.actor : null })),
      payments: o.payments.map((p) => ({ id: p.id, method: p.method, status: p.status, amount: Number(p.amount), reference: p.reference, createdAt: p.createdAt })),
    })),
  });
}
