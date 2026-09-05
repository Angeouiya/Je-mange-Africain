import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { paymentMethodFamily } from "@/lib/payment-methods";

export const dynamic = "force-dynamic";

const SUCCESSFUL_STATUSES = ["captured", "refunded"];
const PENDING_STATUSES = ["pending", "authorized"];

const ledgerQuery = z.object({
  locale: z.enum(["fr", "en"]).default("fr"),
  period: z.enum(["7d", "30d", "90d", "all"]).default("30d"),
  filter: z.enum(["all", "captured", "pending", "refunds", "exceptions"]).default("all"),
  query: z.string().trim().max(120).default(""),
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  pageSize: z.coerce.number().int().min(10).max(100).default(24),
});

type LedgerQuery = z.infer<typeof ledgerQuery>;

function periodStart(period: LedgerQuery["period"], now = new Date()) {
  if (period === "all") return null;
  const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

function statusWhere(filter: LedgerQuery["filter"]): Prisma.PaymentWhereInput {
  if (filter === "captured") return { status: { in: SUCCESSFUL_STATUSES } };
  if (filter === "pending") return { status: { in: PENDING_STATUSES } };
  if (filter === "exceptions") return { status: "failed" };
  return {};
}

function searchWhere(query: string): Prisma.PaymentWhereInput {
  if (!query) return {};
  return {
    OR: [
      { reference: { contains: query } },
      { method: { contains: query } },
      { order: { is: { number: { contains: query } } } },
      { order: { is: { deliveryName: { contains: query } } } },
      { order: { is: { deliveryEmail: { contains: query } } } },
      { order: { is: { deliveryCountry: { contains: query } } } },
    ],
  };
}

function amount(value: unknown) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? Math.round(number * 100) / 100 : 0;
}

export async function GET(request: NextRequest) {
  const authorization = await authorizeAdminRequest(request, { module: "finance", action: "read" });
  if (!authorization.ok) return authorization.response;

  const parsed = ledgerQuery.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: "Les filtres du registre financier sont invalides.", details: parsed.error.flatten() }, { status: 400 });
  }

  const input = parsed.data;
  const start = periodStart(input.period);
  const periodWhere: Prisma.PaymentWhereInput = start ? { createdAt: { gte: start } } : {};
  const successfulPeriodWhere: Prisma.PaymentWhereInput = { AND: [periodWhere, { status: { in: SUCCESSFUL_STATUSES } }] };
  const searchedWhere = searchWhere(input.query);

  let refundPaymentIds: string[] | null = null;
  if (input.filter === "refunds") {
    const refundOrders = await db.order.findMany({
      where: {
        refunds: { some: {} },
        payments: { some: { AND: [successfulPeriodWhere, searchedWhere] } },
      },
      select: {
        payments: {
          where: { AND: [successfulPeriodWhere, searchedWhere] },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: 1,
          select: { id: true },
        },
      },
    });
    refundPaymentIds = refundOrders.flatMap((order) => order.payments.map((payment) => payment.id));
  }

  const rowWhere: Prisma.PaymentWhereInput = input.filter === "refunds"
    ? { id: { in: refundPaymentIds || [] } }
    : { AND: [periodWhere, statusWhere(input.filter), searchedWhere] };

  const [statusGroups, methodGroups, refundGroups, refundOrderCount, countries, currencies, totalRows, payments] = await Promise.all([
    db.payment.groupBy({ by: ["status"], where: periodWhere, _count: { _all: true }, _sum: { amount: true } }),
    db.payment.groupBy({ by: ["method"], where: periodWhere, _count: { _all: true }, _sum: { amount: true } }),
    db.refund.groupBy({
      by: ["status"],
      where: { order: { payments: { some: successfulPeriodWhere } } },
      _count: { _all: true },
      _sum: { amount: true },
    }),
    db.order.count({ where: { refunds: { some: {} }, payments: { some: successfulPeriodWhere } } }),
    db.order.findMany({
      where: { deliveryCountry: { not: null }, payments: { some: successfulPeriodWhere } },
      distinct: ["deliveryCountry"],
      orderBy: { deliveryCountry: "asc" },
      select: { deliveryCountry: true },
    }),
    db.order.findMany({
      where: { payments: { some: successfulPeriodWhere } },
      distinct: ["currency"],
      orderBy: { currency: "asc" },
      select: { currency: true },
    }),
    db.payment.count({ where: rowWhere }),
    db.payment.findMany({
      where: rowWhere,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
      select: {
        id: true,
        amount: true,
        method: true,
        status: true,
        reference: true,
        createdAt: true,
        order: {
          select: {
            id: true,
            number: true,
            status: true,
            currency: true,
            deliveryName: true,
            deliveryEmail: true,
            deliveryCountry: true,
            refunds: { orderBy: { createdAt: "desc" }, select: { id: true, amount: true, status: true, reason: true, createdAt: true } },
            payments: {
              where: { status: { in: SUCCESSFUL_STATUSES } },
              orderBy: [{ createdAt: "desc" }, { id: "desc" }],
              take: 1,
              select: { id: true },
            },
          },
        },
      },
    }),
  ]);

  const statuses = new Map(statusGroups.map((group) => [group.status, { count: group._count._all, amount: amount(group._sum.amount) }]));
  const refunds = new Map(refundGroups.map((group) => [group.status, { count: group._count._all, amount: amount(group._sum.amount) }]));
  const capturedCount = SUCCESSFUL_STATUSES.reduce((sum, status) => sum + (statuses.get(status)?.count || 0), 0);
  const capturedGross = SUCCESSFUL_STATUSES.reduce((sum, status) => sum + (statuses.get(status)?.amount || 0), 0);
  const pendingCount = PENDING_STATUSES.reduce((sum, status) => sum + (statuses.get(status)?.count || 0), 0);
  const pendingAmount = PENDING_STATUSES.reduce((sum, status) => sum + (statuses.get(status)?.amount || 0), 0);
  const allCount = statusGroups.reduce((sum, group) => sum + group._count._all, 0);
  const completedRefunds = refunds.get("completed") || { count: 0, amount: 0 };
  const pendingRefunds = refunds.get("pending") || { count: 0, amount: 0 };
  const methodTotal = methodGroups.reduce((sum, group) => sum + amount(group._sum.amount), 0);
  const methods = methodGroups.map((group) => {
    const methodAmount = amount(group._sum.amount);
    return {
      method: group.method,
      family: paymentMethodFamily(group.method),
      count: group._count._all,
      amount: methodAmount,
      share: methodTotal > 0 ? (methodAmount / methodTotal) * 100 : 0,
    };
  }).sort((left, right) => right.amount - left.amount || right.count - left.count || left.method.localeCompare(right.method));

  const pageCount = Math.max(1, Math.ceil(totalRows / input.pageSize));
  return NextResponse.json({
    rows: payments.map((payment) => {
      const ownsRefunds = payment.order.payments[0]?.id === payment.id;
      return {
        id: payment.id,
        orderId: payment.order.id,
        orderNumber: payment.order.number,
        orderStatus: payment.order.status,
        date: payment.createdAt.toISOString(),
        customer: payment.order.deliveryName || payment.order.deliveryEmail || (input.locale === "fr" ? "Client non renseigné" : "Customer not provided"),
        country: payment.order.deliveryCountry,
        currency: payment.order.currency,
        method: payment.method,
        status: payment.status,
        amount: amount(payment.amount),
        reference: payment.reference,
        refunds: ownsRefunds ? payment.order.refunds.map((refund) => ({
          id: refund.id,
          amount: amount(refund.amount),
          status: refund.status,
          reason: refund.reason,
          createdAt: refund.createdAt.toISOString(),
        })) : [],
      };
    }),
    summary: {
      netCapturedAmount: amount(Math.max(0, capturedGross - completedRefunds.amount)),
      grossCapturedAmount: amount(capturedGross),
      capturedCount,
      pendingAmount: amount(pendingAmount),
      pendingCount,
      refundedAmount: completedRefunds.amount,
      refundCount: refundGroups.reduce((sum, group) => sum + group._count._all, 0),
      pendingRefundAmount: pendingRefunds.amount,
      exceptionAmount: statuses.get("failed")?.amount || 0,
      exceptionCount: statuses.get("failed")?.count || 0,
      reconciliationRate: allCount > 0 ? (capturedCount / allCount) * 100 : 0,
    },
    counts: {
      all: allCount,
      captured: capturedCount,
      pending: pendingCount,
      refunds: refundOrderCount,
      exceptions: statuses.get("failed")?.count || 0,
    },
    methods,
    coverage: {
      countries: countries.flatMap((country) => country.deliveryCountry ? [country.deliveryCountry] : []),
      currencies: currencies.map((entry) => entry.currency),
      familyCount: new Set(methods.map((method) => method.family)).size,
    },
    pagination: {
      page: input.page,
      pageSize: input.pageSize,
      pageCount,
      totalRows,
      hasPrevious: input.page > 1,
      hasNext: input.page < pageCount,
    },
    period: input.period,
  });
}
