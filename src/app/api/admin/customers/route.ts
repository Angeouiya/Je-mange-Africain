import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { customerSegment, NON_COMMERCIAL_ORDER_STATUSES } from "@/lib/customer-analytics";
import { buildCustomerActions, summarizeCustomerPortfolio } from "@/lib/customer-portfolio";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authorization = await authorizeAdminRequest(req, { module: "customers", action: "read" });
  if (!authorization.ok) return authorization.response;
  const [customers, orderMetrics] = await Promise.all([
    db.customer.findMany({
      select: {
        id: true,
        loyaltyPoints: true,
        walletCredit: true,
        preferredLang: true,
        createdAt: true,
        user: { select: { email: true, firstName: true, lastName: true, phone: true } },
        addresses: {
          select: { city: true, country: true, phone: true },
          orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
          take: 1,
        },
        _count: {
          select: {
            addresses: true,
            favorites: true,
            savedRecipes: true,
            tickets: { where: { status: { in: ["open", "pending"] } } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.order.groupBy({
      by: ["customerId"],
      where: {
        customerId: { not: null },
        status: { notIn: [...NON_COMMERCIAL_ORDER_STATUSES] },
      },
      _count: { _all: true },
      _sum: { total: true },
      _avg: { total: true },
      _max: { createdAt: true },
    }),
  ]);

  const metricsByCustomer = new Map(orderMetrics.flatMap((metric) => metric.customerId ? [[metric.customerId, metric] as const] : []));

  const serializedCustomers = customers.map((customer) => {
    const metrics = metricsByCustomer.get(customer.id);
    const orders = metrics?._count._all || 0;
    const lifetimeValue = Number(metrics?._sum.total || 0);
    const averageBasket = Number(metrics?._avg.total || 0);
    const lastOrderAt = metrics?._max.createdAt?.toISOString() || null;
    const primaryAddress = customer.addresses[0];
    return {
      id: customer.id,
      email: customer.user.email,
      name: `${customer.user.firstName || ""} ${customer.user.lastName || ""}`.trim() || customer.user.email,
      phone: customer.user.phone || primaryAddress?.phone || null,
      city: primaryAddress?.city || "—",
      country: primaryAddress?.country || "—",
      orders,
      loyalty: customer.loyaltyPoints,
      walletCredit: Number(customer.walletCredit),
      preferredLang: customer.preferredLang,
      lifetimeValue,
      averageBasket,
      lastOrderAt,
      joinedAt: customer.createdAt.toISOString(),
      addresses: customer._count.addresses,
      favorites: customer._count.favorites,
      savedRecipes: customer._count.savedRecipes,
      openTickets: customer._count.tickets,
      segment: customerSegment({ orders, lifetimeValue, loyalty: customer.loyaltyPoints, lastOrderAt }),
    };
  });
  const now = new Date();

  return NextResponse.json({
    generatedAt: now.toISOString(),
    customers: serializedCustomers,
    summary: summarizeCustomerPortfolio(serializedCustomers, now),
    actions: buildCustomerActions(serializedCustomers, now).slice(0, 12),
  });
}
