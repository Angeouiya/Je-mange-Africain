import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { buildDailyPulse, groupOrderWorkflow, rankTopProducts, summarizeRevenueWindow } from "@/lib/dashboard-insights";
import { percentageChange, profitabilityWindow } from "@/lib/profitability";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authorization = await authorizeAdminRequest(req, { module: "dashboard", action: "read" });
  if (!authorization.ok) return authorization.response;
  const { searchParams } = new URL(req.url);
  const locale: "fr" | "en" = searchParams.get("locale") === "en" ? "en" : "fr";
  const now = new Date();
  const monthWindow = profitabilityWindow("month", now);
  const monthStart = monthWindow.current.start as Date;
  const previousWindow = monthWindow.previous as { start: Date; end: Date };
  const todayStart = new Date(now); todayStart.setUTCHours(0, 0, 0, 0);
  const expiryHorizon = new Date(now.getTime() + 14 * 86_400_000);
  const staleThreshold = new Date(now.getTime() - 24 * 3_600_000);

  const [products, expiringSoon, expiredActive, windowOrders, statusRows, paymentRows, customers, newCustomersMonth, delayedShipments, failedDeliveries, stalePreparation, recentOrders] = await Promise.all([
    db.product.findMany({ where: { status: "published" }, select: { id: true, stockQty: true, reservedQty: true, alertThreshold: true } }),
    db.inventoryBatch.count({ where: { status: "active", expiryDate: { gt: now, lte: expiryHorizon } } }),
    db.inventoryBatch.count({ where: { status: "active", expiryDate: { lte: now } } }),
    db.order.findMany({ where: { createdAt: { gte: previousWindow.start, lte: now } }, include: { items: true, payments: true } }),
    db.order.groupBy({ by: ["status"], _count: { status: true } }),
    db.payment.groupBy({ by: ["status"], where: { createdAt: { gte: monthStart, lte: now } }, _count: { status: true } }),
    db.customer.count(),
    db.customer.count({ where: { createdAt: { gte: monthStart, lte: now } } }),
    db.shipment.count({ where: { estimatedDelivery: { lt: now }, status: { notIn: ["delivered", "failed", "lost"] } } }),
    db.shipment.count({ where: { status: { in: ["failed", "lost"] } } }),
    db.order.count({ where: { status: { in: ["preparing", "packed"] }, updatedAt: { lt: staleThreshold } } }),
    db.order.findMany({ orderBy: { createdAt: "desc" }, take: 5, include: { items: { select: { id: true, qty: true, imageUrl: true } } } }),
  ]);

  const currentOrders = windowOrders.filter((order) => order.createdAt >= monthStart && order.createdAt <= now);
  const previousOrders = windowOrders.filter((order) => order.createdAt >= previousWindow.start && order.createdAt < previousWindow.end);
  const current = summarizeRevenueWindow(currentOrders);
  const previous = summarizeRevenueWindow(previousOrders);
  const today = summarizeRevenueWindow(currentOrders.filter((order) => order.createdAt >= todayStart));
  const statusCounts = Object.fromEntries(statusRows.map((row) => [row.status, row._count.status]));
  const paymentCounts = Object.fromEntries(paymentRows.map((row) => [row.status, row._count.status]));
  const workflow = groupOrderWorkflow(statusCounts);
  const workflowById = new Map(workflow.map((stage) => [stage.id, stage.count]));
  const outOfStock = products.filter((product) => product.stockQty - product.reservedQty <= 0).length;
  const availableProducts = products.filter((product) => product.stockQty - product.reservedQty > 0).length;
  const stockCoverageRate = products.length ? Math.round((availableProducts / products.length) * 1_000) / 10 : 0;
  const paymentAttention = (paymentCounts.pending || 0) + (paymentCounts.failed || 0);
  const toPrepare = ["validated", "paymentConfirmed", "stockReserved"].reduce((sum, status) => sum + (statusCounts[status] || 0), 0);
  const priorityCandidates = [
    { id: "expired", level: "critical" as const, count: expiredActive, title: locale === "fr" ? "Lots arrivés à échéance" : "Expired active batches", detail: locale === "fr" ? "Bloquez ou sortez ces lots avant toute nouvelle allocation." : "Block or remove these batches before any new allocation.", target: "inventory" as const },
    { id: "delivery-delay", level: "critical" as const, count: delayedShipments, title: locale === "fr" ? "Livraisons hors délai" : "Overdue deliveries", detail: locale === "fr" ? "Les dates estimées sont dépassées et demandent un suivi transporteur." : "Estimated dates have passed and require carrier follow-up.", target: "orders" as const },
    { id: "delivery-incident", level: "critical" as const, count: failedDeliveries, title: locale === "fr" ? "Incidents de transport" : "Delivery incidents", detail: locale === "fr" ? "Un échec ou une perte doit être qualifié puis communiqué au client." : "A failure or loss must be qualified and communicated to the customer.", target: "orders" as const },
    { id: "payment", level: "attention" as const, count: paymentAttention, title: locale === "fr" ? "Paiements à rapprocher" : "Payments to reconcile", detail: locale === "fr" ? "Les paiements en attente ou en échec du mois doivent être examinés." : "This month's pending or failed payments need review.", target: "finance" as const },
    { id: "stockout", level: "attention" as const, count: outOfStock, title: locale === "fr" ? "Produits indisponibles" : "Unavailable products", detail: locale === "fr" ? "L'offre publiée n'est plus vendable avec le stock actuellement disponible." : "Published products are no longer sellable with current available stock.", target: "inventory" as const },
    { id: "stale-preparation", level: "attention" as const, count: stalePreparation, title: locale === "fr" ? "Préparations sans mouvement" : "Stalled fulfilment", detail: locale === "fr" ? "Ces commandes n'ont pas progressé depuis plus de 24 heures." : "These orders have not progressed for more than 24 hours.", target: "orders" as const },
    { id: "expiry", level: "monitor" as const, count: expiringSoon, title: locale === "fr" ? "Échéances sous 14 jours" : "Expiring within 14 days", detail: locale === "fr" ? "Priorisez ces lots dans les prochaines vagues selon la règle FEFO." : "Prioritise these batches in upcoming FEFO waves.", target: "inventory" as const },
  ];

  return NextResponse.json({
    generatedAt: now.toISOString(),
    kpis: {
      revenueToday: today.revenue,
      revenueMonth: current.revenue,
      orders: Object.values(statusCounts).reduce((sum, count) => sum + count, 0),
      monthOrders: current.orders,
      avgBasket: current.averageBasket,
      outOfStock,
      expiringSoon,
      customers,
      toPrepare,
      activeOrders: (workflowById.get("validate") || 0) + (workflowById.get("prepare") || 0) + (workflowById.get("deliver") || 0),
      inDelivery: workflowById.get("deliver") || 0,
      paymentAttention,
      newCustomersMonth,
      stockCoverageRate,
    },
    comparison: {
      revenue: percentageChange(current.revenue, previous.revenue),
      orders: percentageChange(current.orders, previous.orders),
      averageBasket: percentageChange(current.averageBasket, previous.averageBasket),
    },
    pulse: buildDailyPulse(windowOrders, now, locale),
    workflow,
    priorities: priorityCandidates.filter((priority) => priority.count > 0),
    recentOrders: recentOrders.map((order) => ({
      id: order.id,
      number: order.number,
      status: order.status,
      total: Number(order.total),
      createdAt: order.createdAt.toISOString(),
      deliveryName: order.deliveryName || (locale === "fr" ? "Client non renseigné" : "Unnamed customer"),
      deliveryCity: order.deliveryCity || order.deliveryCountry || "—",
      itemCount: order.items.reduce((sum, item) => sum + item.qty, 0),
      imageUrl: order.items.find((item) => item.imageUrl)?.imageUrl || null,
    })),
    topProducts: rankTopProducts(currentOrders, locale).map((product) => ({ ...product, imageColor: "#D65A32" })),
  });
}
