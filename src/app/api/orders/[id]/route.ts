import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authorizeOrderAccess } from "@/lib/order-access";
import { getProductPhoto } from "@/lib/market-media";
import { wholesaleAvailablePacks, wholesalePriceForQuantity, wholesaleTiers } from "@/lib/wholesale";

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
      customer: { select: { user: { select: { email: true, phone: true } } } },
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
    currency: order.currency,
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
    customerEmail: order.deliveryEmail || order.customer?.user.email || null,
    customerPhone: order.deliveryPhone || order.customer?.user.phone || null,
    items: order.items.map((it) => {
      const product = productsById.get(it.productId);
      const salesChannel = it.salesChannel === "wholesale" ? "wholesale" : "retail";
      const tiers = product && salesChannel === "wholesale" ? wholesaleTiers({ wholesaleMinPacks: product.wholesaleMinPacks, wholesalePrice: product.wholesalePrice === null ? null : Number(product.wholesalePrice), wholesaleTier2MinPacks: product.wholesaleTier2MinPacks, wholesaleTier2Price: product.wholesaleTier2Price === null ? null : Number(product.wholesaleTier2Price), wholesaleTier3MinPacks: product.wholesaleTier3MinPacks, wholesaleTier3Price: product.wholesaleTier3Price === null ? null : Number(product.wholesaleTier3Price) }) : [];
      const maxStock = product?.status === "published" ? (salesChannel === "wholesale" ? wholesaleAvailablePacks(product.stockQty, product.reservedQty, it.unitsPerPack) : Math.max(0, product.stockQty - product.reservedQty)) : 0;
      const currentUnitPrice = product ? (salesChannel === "wholesale" && product.isWholesale && tiers.length ? wholesalePriceForQuantity(tiers, it.qty) : Number(product.isOnSale && product.promoPrice ? product.promoPrice : product.price)) : Number(it.unitPrice);
      return {
        id: it.id, productId: it.productId,
        name: locale === "en" ? it.nameEn : it.nameFr,
        nameFr: it.nameFr, nameEn: it.nameEn, sku: it.sku,
        unitPrice: Number(it.unitPrice), currentUnitPrice, qty: it.qty, lineTotal: Number(it.lineTotal),
        thermalClass: it.thermalClass, recipeId: it.recipeId,
        packWeightGrams: it.packWeightGrams || product?.netWeightGrams || 0,
        unitLabel: salesChannel === "wholesale" ? product?.wholesalePackLabel || "" : product?.packaging || "",
        salesChannel,
        unitsPerPack: it.unitsPerPack,
        minimumQty: salesChannel === "wholesale" ? product?.wholesaleMinPacks || 1 : 1,
        wholesaleTiers: tiers,
        maxStock,
        purchasable: salesChannel === "wholesale" ? Boolean(product?.isWholesale && maxStock >= (product.wholesaleMinPacks || 1) && tiers.length) : maxStock > 0,
        imageUrl: it.imageUrl || getProductPhoto({ name: it.nameFr, traditionalName: product?.traditionalName, imageUrl: product?.imageUrl, imageEmoji: product?.imageEmoji, country: product?.country, category: product?.category }),
        recipeName: locale === "en" ? it.recipeNameEn : it.recipeNameFr,
      };
    }),
    shipments: order.shipments.map((s) => ({
      id: s.id, trackingNumber: s.trackingNumber, thermalClass: s.thermalClass, status: s.status,
      estimatedDelivery: s.estimatedDelivery, actualDelivery: s.actualDelivery, confirmCode: s.confirmCode,
      carrier: s.carrier?.name || null,
      carrierName: s.carrier?.name || null, trackingUrl: s.carrier?.trackingUrl || null,
      proofPhoto: s.proofPhoto, signature: s.signature,
    })),
    timeline: order.timeline.map((e) => ({ status: e.status, label: e.label, at: e.at, actor: access.scope === "admin" ? e.actor : null })),
    payments: order.payments.map((p) => ({ id: p.id, method: p.method, status: p.status, amount: Number(p.amount), reference: p.reference })),
  });
}
