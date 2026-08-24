import webpush from "web-push";
import { db } from "@/lib/db";

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  type?: "order" | "promotion" | "recipe" | "system";
  tag?: string;
  image?: string;
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

export async function sendPushToSubscriptionId(id: string, payload: PushPayload) {
  const subscription = await db.pushSubscription.findUnique({ where: { id } });
  if (!subscription?.enabled || !configureWebPush()) return { sent: false, reason: "unavailable" as const };

  try {
    await webpush.sendNotification(
      { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
      JSON.stringify(payload),
      { TTL: 60 * 60 * 24, urgency: payload.type === "order" ? "high" : "normal", topic: payload.tag?.slice(0, 32) }
    );
    await db.pushSubscription.update({
      where: { id },
      data: { lastSentAt: new Date(), failureCount: 0, enabled: true },
    });
    return { sent: true as const };
  } catch (error) {
    const statusCode = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : 0;
    if (statusCode === 404 || statusCode === 410) {
      await db.pushSubscription.delete({ where: { id } }).catch(() => undefined);
      return { sent: false, reason: "expired" as const };
    }
    await db.pushSubscription.update({
      where: { id },
      data: { failureCount: { increment: 1 }, enabled: subscription.failureCount < 4 },
    }).catch(() => undefined);
    return { sent: false, reason: "delivery_failed" as const };
  }
}

export async function broadcastPush(payload: PushPayload) {
  if (!configureWebPush()) return { total: 0, sent: 0, failed: 0, configured: false };
  const subscriptions = await db.pushSubscription.findMany({ where: { enabled: true }, take: 1000 });
  let sent = 0;
  let failed = 0;

  for (let index = 0; index < subscriptions.length; index += 25) {
    const batch = subscriptions.slice(index, index + 25);
    const results = await Promise.all(batch.map((subscription) => sendPushToSubscriptionId(subscription.id, payload)));
    sent += results.filter((result) => result.sent).length;
    failed += results.filter((result) => !result.sent).length;
  }

  return { total: subscriptions.length, sent, failed, configured: true };
}
