import type { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { getProductPhoto } from "@/lib/market-media";
import {
  percentageChange,
  netSettlementRatio,
  profitabilityWindow,
  shareOfTotal,
  weightedBatchUnitCost,
  type ProfitabilityPeriod,
} from "@/lib/profitability";

export const dynamic = "force-dynamic";

const orderInclude = {
  items: true,
  payments: true,
  refunds: true,
  batchAllocations: { include: { batch: { include: { warehouse: true } } } },
} satisfies Prisma.OrderInclude;

const productInclude = {
  category: true,
  translations: true,
  batches: true,
} satisfies Prisma.ProductInclude;

type ProfitabilityOrder = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;
type ProfitabilityProduct = Prisma.ProductGetPayload<{ include: typeof productInclude }>;
type Locale = "fr" | "en";
type Accumulator = {
  id: string;
  label: string;
  secondary?: string;
  revenue: number;
  grossCost: number;
  units: number;
  orders: Set<string>;
};

const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

function addValue(map: Map<string, Accumulator>, key: string, base: Omit<Accumulator, "revenue" | "grossCost" | "units" | "orders">, orderId: string, revenue: number, grossCost: number, units: number) {
  const current = map.get(key) || { ...base, revenue: 0, grossCost: 0, units: 0, orders: new Set<string>() };
  current.revenue += revenue;
  current.grossCost += grossCost;
  current.units += units;
  current.orders.add(orderId);
  map.set(key, current);
}

function serialize(row: Accumulator) {
  const revenue = roundMoney(row.revenue);
  const grossCost = roundMoney(row.grossCost);
  const margin = roundMoney(revenue - grossCost);
  return {
    id: row.id,
    label: row.label,
    secondary: row.secondary || null,
    revenue,
    grossCost,
    margin,
    marginRate: revenue > 0 ? roundMoney((margin / revenue) * 100) : 0,
    units: row.units,
    orders: row.orders.size,
  };
}

function aggregate(orders: ProfitabilityOrder[], productMap: Map<string, ProfitabilityProduct>, locale: Locale) {
  const general: Accumulator = { id: "general", label: locale === "fr" ? "Ensemble de l'activité" : "Entire business", revenue: 0, grossCost: 0, units: 0, orders: new Set<string>() };
  const categories = new Map<string, Accumulator>();
  const lots = new Map<string, Accumulator>();
  const topProducts = new Map<string, Accumulator>();
  let traceableUnits = 0;

  for (const order of orders) {
    const capturedAmount = order.payments
      .filter((payment) => payment.status === "captured")
      .reduce((sum, payment) => sum + Number(payment.amount), 0);
    const refundedAmount = order.refunds
      .filter((refund) => refund.status === "completed")
      .reduce((sum, refund) => sum + Number(refund.amount), 0);
    const settlementRatio = netSettlementRatio(capturedAmount, refundedAmount, Number(order.total));
    const discountRatio = Number(order.subtotal) > 0
      ? Math.max(0, Number(order.subtotal) - Number(order.promoDiscount)) / Number(order.subtotal)
      : 1;
    const itemGroups = new Map<string, { quantity: number; revenue: number; name: string }>();

    for (const item of order.items) {
      const current = itemGroups.get(item.productId) || { quantity: 0, revenue: 0, name: locale === "fr" ? item.nameFr : item.nameEn };
      current.quantity += item.qty * Math.max(1, item.unitsPerPack);
      current.revenue += Number(item.lineTotal) * discountRatio * settlementRatio;
      itemGroups.set(item.productId, current);
    }

    for (const [productId, itemGroup] of itemGroups) {
      const product = productMap.get(productId);
      const activeBatches = product?.batches.filter((batch) => batch.status === "active" && batch.quantity > 0) || [];
      const costBatches = activeBatches.length ? activeBatches : product?.batches || [];
      const weightedBatchCost = weightedBatchUnitCost(costBatches.map((batch) => ({ quantity: batch.quantity, costPrice: Number(batch.costPrice) })));
      const standardCost = product?.costPrice !== null && product?.costPrice !== undefined ? Number(product.costPrice) : weightedBatchCost;
      const allocations = order.batchAllocations.filter((allocation) => allocation.productId === productId);
      const allocatedQuantity = allocations.reduce((sum, allocation) => sum + allocation.quantity, 0);
      const allocatedCost = allocations.reduce((sum, allocation) => sum + allocation.quantity * Number(allocation.unitCost), 0);
      const unallocatedQuantity = Math.max(0, itemGroup.quantity - allocatedQuantity);
      const grossCost = allocatedCost + unallocatedQuantity * standardCost;
      const categoryId = product?.categoryId || "uncategorized";
      const categoryLabel = product
        ? (locale === "fr" ? product.category.nameFr : product.category.nameEn)
        : (locale === "fr" ? "Sans famille" : "Uncategorised");
      const productName = product?.translations.find((translation) => translation.locale === locale)?.name || itemGroup.name;

      general.revenue += itemGroup.revenue;
      general.grossCost += grossCost;
      general.units += itemGroup.quantity;
      general.orders.add(order.id);
      traceableUnits += Math.min(itemGroup.quantity, allocatedQuantity);
      addValue(categories, categoryId, { id: categoryId, label: categoryLabel }, order.id, itemGroup.revenue, grossCost, itemGroup.quantity);
      addValue(topProducts, productId, { id: productId, label: productName, secondary: product?.sku }, order.id, itemGroup.revenue, grossCost, itemGroup.quantity);

      for (const allocation of allocations) {
        const share = itemGroup.quantity > 0 ? allocation.quantity / itemGroup.quantity : 0;
        addValue(
          lots,
          allocation.batchId,
          {
            id: allocation.batchId,
            label: allocation.batch.lotNumber,
            secondary: `${productName} · ${allocation.batch.warehouse.name}`,
          },
          order.id,
          itemGroup.revenue * share,
          allocation.quantity * Number(allocation.unitCost),
          allocation.quantity,
        );
      }

      if (unallocatedQuantity > 0) {
        const share = itemGroup.quantity > 0 ? unallocatedQuantity / itemGroup.quantity : 0;
        addValue(
          lots,
          `unallocated:${productId}`,
          {
            id: `unallocated:${productId}`,
            label: locale === "fr" ? "Historique sans lot" : "History without batch",
            secondary: productName,
          },
          order.id,
          itemGroup.revenue * share,
          unallocatedQuantity * standardCost,
          unallocatedQuantity,
        );
      }
    }
  }

  const serializedGeneral = serialize(general);
  return {
    general: serializedGeneral,
    categories: Array.from(categories.values()).map(serialize).sort((a, b) => b.revenue - a.revenue),
    lots: Array.from(lots.values()).map(serialize).sort((a, b) => b.margin - a.margin),
    topProducts: Array.from(topProducts.values()).map(serialize).sort((a, b) => b.units - a.units || b.revenue - a.revenue).slice(0, 10),
    traceabilityRate: shareOfTotal(traceableUnits, serializedGeneral.units),
  };
}

function orderWindowWhere(start: Date | null, end: Date, endExclusive = false): Prisma.OrderWhereInput {
  return {
    status: { notIn: ["cart", "cancelled"] },
    OR: [
      { payments: { some: { status: { in: ["captured", "refunded"] } } } },
      { refunds: { some: { status: "completed" } } },
    ],
    createdAt: {
      ...(start ? { gte: start } : {}),
      ...(endExclusive ? { lt: end } : { lte: end }),
    },
  };
}

export async function GET(request: NextRequest) {
  const authorization = await authorizeAdminRequest(request, { module: "finance", action: "read" });
  if (!authorization.ok) return authorization.response;

  const searchParams = new URL(request.url).searchParams;
  const locale: Locale = searchParams.get("locale") === "en" ? "en" : "fr";
  const requestedPeriod = searchParams.get("period") as ProfitabilityPeriod | null;
  const period: ProfitabilityPeriod = ["30d", "month", "year", "all"].includes(requestedPeriod || "") ? requestedPeriod as ProfitabilityPeriod : "all";
  const window = profitabilityWindow(period);

  const [orders, previousOrders] = await Promise.all([
    db.order.findMany({
      where: orderWindowWhere(window.current.start, window.current.end),
      include: orderInclude,
      orderBy: { createdAt: "desc" },
    }),
    window.previous
      ? db.order.findMany({
        where: orderWindowWhere(window.previous.start, window.previous.end, true),
        include: orderInclude,
        orderBy: { createdAt: "desc" },
      })
      : Promise.resolve([]),
  ]);

  const productIds = Array.from(new Set([...orders, ...previousOrders].flatMap((order) => order.items.map((item) => item.productId))));
  const products = productIds.length
    ? await db.product.findMany({ where: { id: { in: productIds } }, include: productInclude })
    : [];
  const productMap = new Map(products.map((product) => [product.id, product]));
  const current = aggregate(orders, productMap, locale);
  const previous = window.previous ? aggregate(previousOrders, productMap, locale) : null;

  const categories = current.categories.map((row) => ({ ...row, contributionRate: shareOfTotal(row.revenue, current.general.revenue) }));
  const lots = current.lots.map((row) => ({ ...row, contributionRate: shareOfTotal(row.revenue, current.general.revenue) }));
  const topProducts = current.topProducts.map((row) => {
    const product = productMap.get(row.id);
    return {
      ...row,
      contributionRate: shareOfTotal(row.revenue, current.general.revenue),
      imageUrl: product ? getProductPhoto({
        traditionalName: product.traditionalName,
        name: row.label,
        imageUrl: product.imageUrl,
        imageEmoji: product.imageEmoji,
        country: product.country,
        category: { slug: product.category.slug, name: locale === "fr" ? product.category.nameFr : product.category.nameEn },
      }) : null,
      imageColor: product?.imageColor || "#8A3042",
      country: product?.country || null,
      stockQty: product?.stockQty || 0,
      reservedQty: product?.reservedQty || 0,
      availableStock: product ? Math.max(0, product.stockQty - product.reservedQty) : 0,
      alertThreshold: product?.alertThreshold || 0,
    };
  });

  const recommendations = topProducts.slice(0, 5).map((product, index) => {
    const lowStock = product.availableStock <= product.alertThreshold;
    const lowMargin = product.marginRate < 20;
    const kind = lowStock ? "restock" : lowMargin ? "margin" : "priority";
    return {
      id: `${kind}:${product.id}`,
      kind,
      productId: product.id,
      label: product.label,
      detail: lowStock
        ? (locale === "fr" ? `${product.availableStock} unités disponibles pour un seuil de ${product.alertThreshold}.` : `${product.availableStock} units available against a threshold of ${product.alertThreshold}.`)
        : lowMargin
          ? (locale === "fr" ? `Le taux de marge de ${product.marginRate.toLocaleString("fr-FR")} % mérite une révision.` : `The ${product.marginRate.toLocaleString("en-GB")}% margin rate needs review.`)
          : (locale === "fr" ? `N° ${index + 1} des ventes avec ${product.units} unités achetées.` : `No. ${index + 1} by sales with ${product.units} units purchased.`),
    };
  });

  return NextResponse.json({
    period,
    generatedAt: new Date().toISOString(),
    window: {
      start: window.current.start?.toISOString() || null,
      end: window.current.end.toISOString(),
      previousStart: window.previous?.start.toISOString() || null,
      previousEnd: window.previous?.end.toISOString() || null,
    },
    general: { ...current.general, traceabilityRate: current.traceabilityRate },
    categories,
    lots,
    topProducts,
    recommendations,
    comparison: previous ? {
      revenue: percentageChange(current.general.revenue, previous.general.revenue),
      grossCost: percentageChange(current.general.grossCost, previous.general.grossCost),
      margin: percentageChange(current.general.margin, previous.general.margin),
      units: percentageChange(current.general.units, previous.general.units),
      previous: previous.general,
    } : null,
  });
}
