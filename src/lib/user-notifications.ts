import { db } from "@/lib/db";
import { sendPushToUser, type LocalizedPushPayload, type PushPayload } from "@/lib/push-server";

type UserNotificationInput = {
  userId: string;
  type: NonNullable<PushPayload["type"]>;
  url: string;
  tag: string;
  fr: Pick<PushPayload, "title" | "body">;
  en: Pick<PushPayload, "title" | "body">;
};

const EMPTY_DELIVERY = { total: 0, sent: 0, failed: 0, configured: false };

/**
 * Persists the in-app activity first, then attempts Web Push delivery on every
 * eligible customer device. Notification delivery must never break the
 * checkout, refund, or fulfillment transaction that triggered it.
 */
export async function createAndSendUserNotification(input: UserNotificationInput) {
  const notification = await db.notification.create({
    data: {
      userId: input.userId,
      channel: "push",
      type: input.type,
      titleFr: input.fr.title,
      titleEn: input.en.title,
      bodyFr: input.fr.body,
      bodyEn: input.en.body,
      url: input.url,
    },
  }).catch(() => null);

  const payload: LocalizedPushPayload = {
    fr: { ...input.fr, url: input.url, type: input.type, tag: input.tag },
    en: { ...input.en, url: input.url, type: input.type, tag: input.tag },
  };
  const delivery = await sendPushToUser(input.userId, payload).catch(() => EMPTY_DELIVERY);

  if (notification) {
    await db.notification.update({
      where: { id: notification.id },
      data: {
        sent: delivery.sent > 0,
        recipientCount: delivery.total,
        deliveredCount: delivery.sent,
        failedCount: delivery.failed,
      },
    }).catch(() => undefined);
  }

  return { notificationId: notification?.id || null, delivery };
}
