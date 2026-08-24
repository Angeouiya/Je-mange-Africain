import { NextRequest, NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type Period = "30d" | "month" | "year" | "all";
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

function periodStart(period: Period) {
  const now = new Date();
  if (period === "30d") return new Date(now.getTime() - 30 * 86_400_000);
  if (period === "month") return new Date(now.getFullYear(), now.getMonth(), 1);
  if (period === "year") return new Date(now.getFullYear(), 0, 1);
  return null;
}

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

export async function GET(request: NextRequest) {
  const authorization = await authorizeAdminRequest(request);
  if (!authorization.ok) return authorization.response;

  const searchParams = new URL(request.url).searchParams;
  const locale = searchParams.get("locale") === "en" ? "en" : "fr";
  const requestedPeriod = searchParams.get("period") as Period | null;
  const period: Period = ["30d", "month", "year", "all"].includes(requestedPeriod || "") ? requestedPeriod as Period : "all";
  const start = periodStart(period);

  const orders = await db.order.findMany({
    where: {
      status: { notIn: ["cart", "cancelled"] },
      payments: { some: { status: "captured" } },
      ...(start ? { createdAt: { gte: start } } : {}),
    },
    include: {
      items: true,
      batchAllocations: { include: { batch: { include: { warehouse: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  const productIds = Array.from(new Set(orders.flatMap((order) => order.items.map((item) => item.productId))));
  const products = await db.product.findMany({
    where: { id: { in: productIds } },
    include: { category: true, translations: true, batches: true },
  });
  const productMap = new Map(products.map((product) => [product.id, product]));

  const general: Accumulator = { id: "general", label: locale === "fr" ? "Ensemble de l'activité" : "Entire business", revenue: 0, grossCost: 0, units: 0, orders: new Set<string>() };
  const categories = new Map<string, Accumulator>();
  const lots = new Map<string, Accumulator>();
  const topProducts = new Map<string, Accumulator>();

  for (const order of orders) {
    const discountRatio = Number(order.subtotal) > 0
      ? Math.max(0, Number(order.subtotal) - Number(order.promoDiscount)) / Number(order.subtotal)
      : 1;
    const itemGroups = new Map<string, { quantity: number; revenue: number; name: string }>();
    for (const item of order.items) {
      const current = itemGroups.get(item.productId) || { quantity: 0, revenue: 0, name: locale === "fr" ? item.nameFr : item.nameEn };
      current.quantity += item.qty;
      current.revenue += Number(item.lineTotal) * discountRatio;
      itemGroups.set(item.productId, current);
    }

    for (const [productId, itemGroup] of itemGroups) {
      const product = productMap.get(productId);
      const batchWeight = product?.batches.reduce((sum, batch) => sum + Math.max(0, batch.quantity + batch.reserved), 0) || 0;
      const weightedBatchCost = batchWeight > 0
        ? (product?.batches.reduce((sum, batch) => sum + Number(batch.costPrice) * Math.max(0, batch.quantity + batch.reserved), 0) || 0) / batchWeight
        : 0;
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

  return NextResponse.json({
    period,
    generatedAt: new Date().toISOString(),
    general: serialize(general),
    categories: Array.from(categories.values()).map(serialize).sort((a, b) => b.revenue - a.revenue),
    lots: Array.from(lots.values()).map(serialize).sort((a, b) => b.margin - a.margin),
    topProducts: Array.from(topProducts.values()).map(serialize).sort((a, b) => b.units - a.units || b.revenue - a.revenue).slice(0, 10),
  });
}
