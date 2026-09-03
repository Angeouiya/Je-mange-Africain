export const PUSH_AUDIENCES = ["all", "signed_in", "guests", "ambassador", "active", "at_risk", "new"] as const;

export type PushAudience = (typeof PUSH_AUDIENCES)[number];
export type PushAudienceCounts = Record<PushAudience, number>;

export type PushCampaignDraft = {
  titleFr: string;
  titleEn: string;
  bodyFr: string;
  bodyEn: string;
};

export type PushDeliveryInput = {
  sent: boolean;
  recipientCount: number;
  deliveredCount: number;
  failedCount: number;
};

export type PushDeliveryState = "delivered" | "partial" | "failed" | "not_sent" | "empty";

function positiveCount(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}

export function pushCampaignReadiness(draft: PushCampaignDraft, audienceCount: number, configured: boolean) {
  const checks = {
    french: draft.titleFr.trim().length >= 3 && draft.bodyFr.trim().length >= 8,
    english: draft.titleEn.trim().length >= 3 && draft.bodyEn.trim().length >= 8,
    audience: positiveCount(audienceCount) > 0,
    channel: configured,
  };
  const completed = Object.values(checks).filter(Boolean).length;

  return {
    checks,
    completed,
    total: Object.keys(checks).length,
    percentage: completed * 25,
    ready: completed === Object.keys(checks).length,
  };
}

export function pushDeliveryPerformance(delivery: PushDeliveryInput) {
  const recipients = positiveCount(delivery.recipientCount);
  const delivered = Math.min(recipients, positiveCount(delivery.deliveredCount));
  const failed = Math.min(Math.max(0, recipients - delivered), positiveCount(delivery.failedCount));
  const deliveryRate = recipients > 0 ? Math.round((delivered / recipients) * 1_000) / 10 : 0;
  const failureRate = recipients > 0 ? Math.round((failed / recipients) * 1_000) / 10 : 0;
  let state: PushDeliveryState = "empty";

  if (recipients > 0 && delivered === recipients) state = "delivered";
  else if (delivered > 0) state = "partial";
  else if (failed > 0) state = "failed";
  else if (recipients > 0 && !delivery.sent) state = "not_sent";

  return { recipients, delivered, failed, deliveryRate, failureRate, state };
}

export function aggregatePushDelivery(deliveries: PushDeliveryInput[]) {
  return pushDeliveryPerformance(deliveries.reduce<PushDeliveryInput>((total, delivery) => ({
    sent: total.sent || delivery.sent,
    recipientCount: total.recipientCount + positiveCount(delivery.recipientCount),
    deliveredCount: total.deliveredCount + positiveCount(delivery.deliveredCount),
    failedCount: total.failedCount + positiveCount(delivery.failedCount),
  }), { sent: false, recipientCount: 0, deliveredCount: 0, failedCount: 0 }));
}
