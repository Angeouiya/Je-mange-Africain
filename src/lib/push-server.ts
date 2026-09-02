import webpush from "web-push";
import type { Prisma } from "@prisma/client";
import { customerSegment, NON_COMMERCIAL_ORDER_STATUSES, type CustomerSegment } from "@/lib/customer-analytics";
import { db } from "@/lib/db";
import type { PushAudience, PushAudienceCounts } from "@/lib/push-audience";

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  type?: "order" | "promotion" | "recipe" | "system";
  tag?: string;
  image?: string;
};

export type LocalizedPushPayload = { fr: PushPayload; en: PushPayload };

type DeliverySubscription = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  locale: string;
  failureCount: number;
};

function configureWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:notifications@je-mange-africain.com";
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

export function isPushConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

async function deliverPush(subscription: DeliverySubscription, payload: PushPayload) {
  try {
    await webpush.sendNotification(
      { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
      JSON.stringify(payload),
      { TTL: 60 * 60 * 24, urgency: payload.type === "order" ? "high" : "normal", topic: payload.tag?.slice(0, 32) }
    );
    await db.pushSubscription.update({
      where: { id: subscription.id },
      data: { lastSentAt: new Date(), failureCount: 0, enabled: true },
    });
    return { sent: true as const };
  } catch (error) {
    const statusCode = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : 0;
    if (statusCode === 404 || statusCode === 410) {
      await db.pushSubscription.delete({ where: { id: subscription.id } }).catch(() => undefined);
      return { sent: false, reason: "expired" as const };
    }
    await db.pushSubscription.update({
      where: { id: subscription.id },
      data: { failureCount: { increment: 1 }, enabled: subscription.failureCount < 4 },
    }).catch(() => undefined);
    return { sent: false, reason: "delivery_failed" as const };
  }
}

export async function sendPushToSubscriptionId(id: string, payload: PushPayload) {
  const subscription = await db.pushSubscription.findUnique({ where: { id } });
  if (!subscription?.enabled || !configureWebPush()) return { sent: false, reason: "unavailable" as const };
  return deliverPush(subscription, payload);
}

async function customerSegmentUserIds() {
  const [customers, orderMetrics] = await Promise.all([
    db.customer.findMany({ select: { id: true, userId: true, loyaltyPoints: true } }),
    db.order.groupBy({
      by: ["customerId"],
      where: { customerId: { not: null }, status: { notIn: [...NON_COMMERCIAL_ORDER_STATUSES] } },
      _count: { _all: true },
      _sum: { total: true },
      _max: { createdAt: true },
    }),
  ]);
  const metricsByCustomer = new Map(orderMetrics.flatMap((metric) => metric.customerId ? [[metric.customerId, metric] as const] : []));
  const userIds: Record<CustomerSegment, string[]> = { ambassador: [], active: [], at_risk: [], new: [] };
  customers.forEach((customer) => {
    const metrics = metricsByCustomer.get(customer.id);
    const segment = customerSegment({
      orders: metrics?._count._all || 0,
      lifetimeValue: Number(metrics?._sum.total || 0),
      loyalty: customer.loyaltyPoints,
      lastOrderAt: metrics?._max.createdAt || null,
    });
    userIds[segment].push(customer.userId);
  });
  return userIds;
}

function audienceWhere(audience: PushAudience, segmentUserIds?: Record<CustomerSegment, string[]>): Prisma.PushSubscriptionWhereInput {
  if (audience === "signed_in") return { userId: { not: null } };
  if (audience === "guests") return { userId: null };
  if (audience === "all") return {};
  return { userId: { in: segmentUserIds?.[audience] || [] } };
}

export async function getPushAudienceCounts(): Promise<PushAudienceCounts> {
  const [all, signedIn, guests, segmentUserIds] = await Promise.all([
    db.pushSubscription.count({ where: { enabled: true } }),
    db.pushSubscription.count({ where: { enabled: true, userId: { not: null } } }),
    db.pushSubscription.count({ where: { enabled: true, userId: null } }),
    customerSegmentUserIds(),
  ]);
  const [ambassador, active, atRisk, newCustomers] = await Promise.all([
    db.pushSubscription.count({ where: { enabled: true, ...audienceWhere("ambassador", segmentUserIds) } }),
    db.pushSubscription.count({ where: { enabled: true, ...audienceWhere("active", segmentUserIds) } }),
    db.pushSubscription.count({ where: { enabled: true, ...audienceWhere("at_risk", segmentUserIds) } }),
    db.pushSubscription.count({ where: { enabled: true, ...audienceWhere("new", segmentUserIds) } }),
  ]);
  return { all, signed_in: signedIn, guests, ambassador, active, at_risk: atRisk, new: newCustomers };
}

export async function broadcastLocalizedPush(payload: LocalizedPushPayload, audience: PushAudience = "all") {
  const segmentUserIds = ["ambassador", "active", "at_risk", "new"].includes(audience) ? await customerSegmentUserIds() : undefined;
  const target = audienceWhere(audience, segmentUserIds);
  const total = await db.pushSubscription.count({ where: { enabled: true, ...target } });
  if (!configureWebPush()) return { total, sent: 0, failed: total, configured: false };
  let sent = 0;
  let failed = 0;
  let lastId: string | null = null;

  while (true) {
    const subscriptions = await db.pushSubscription.findMany({
      where: { enabled: true, ...target, ...(lastId ? { id: { gt: lastId } } : {}) },
      orderBy: { id: "asc" },
      take: 500,
      select: { id: true, endpoint: true, p256dh: true, auth: true, locale: true, failureCount: true },
    });
    if (!subscriptions.length) break;
    lastId = subscriptions[subscriptions.length - 1].id;
    for (let index = 0; index < subscriptions.length; index += 25) {
      const batch = subscriptions.slice(index, index + 25);
      const results = await Promise.all(batch.map((subscription) => deliverPush(subscription, payload[subscription.locale === "en" ? "en" : "fr"])));
      sent += results.filter((result) => result.sent).length;
      failed += results.filter((result) => !result.sent).length;
    }
  }

  return { total, sent, failed, configured: true };
}

export async function sendPushToUser(userId: string, payload: LocalizedPushPayload) {
  if (!configureWebPush()) return { total: 0, sent: 0, failed: 0, configured: false };
  const subscriptions = await db.pushSubscription.findMany({ where: { userId, enabled: true }, take: 20 });
  const results = await Promise.all(
    subscriptions.map((subscription) => deliverPush(subscription, payload[subscription.locale === "en" ? "en" : "fr"])),
  );
  return {
    total: subscriptions.length,
    sent: results.filter((result) => result.sent).length,
    failed: results.filter((result) => !result.sent).length,
    configured: true,
  };
}
