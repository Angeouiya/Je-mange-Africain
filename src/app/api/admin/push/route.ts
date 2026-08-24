import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { broadcastPush } from "@/lib/push-server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const CAMPAIGN_ROLES = new Set(["super_admin", "direction", "marketing", "support"]);
const Campaign = z.object({
  titleFr: z.string().trim().min(3).max(80),
  titleEn: z.string().trim().min(3).max(80),
  bodyFr: z.string().trim().min(8).max(220),
  bodyEn: z.string().trim().min(8).max(220),
  type: z.enum(["promotion", "recipe", "system"]).default("system"),
  url: z.string().trim().startsWith("/").max(300).default("/"),
});

export async function GET(request: NextRequest) {
  const authorization = await authorizeAdminRequest(request);
  if (!authorization.ok) return authorization.response;
  const [activeSubscriptions, recent] = await Promise.all([
    db.pushSubscription.count({ where: { enabled: true } }),
    db.notification.findMany({ where: { channel: "push" }, orderBy: { createdAt: "desc" }, take: 8 }),
  ]);
  return NextResponse.json({ activeSubscriptions, recent });
}

export async function POST(request: NextRequest) {
  const authorization = await authorizeAdminRequest(request);
  if (!authorization.ok) return authorization.response;
  if (!CAMPAIGN_ROLES.has(authorization.user.role)) {
    return NextResponse.json({ error: "Votre rôle ne permet pas d'envoyer une campagne." }, { status: 403 });
  }
  const parsed = Campaign.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Contenu de campagne invalide." }, { status: 400 });

  const { url, ...notificationContent } = parsed.data;
  const campaign = await db.notification.create({
    data: { ...notificationContent, channel: "push", sent: false },
  });
  const delivery = await broadcastPush({
    title: parsed.data.titleFr,
    body: parsed.data.bodyFr,
    url,
    type: parsed.data.type,
    tag: `campaign-${campaign.id}`,
  });
  await db.notification.update({ where: { id: campaign.id }, data: { sent: delivery.sent > 0 } });
  await db.auditLog.create({
    data: {
      action: "push_campaign_sent",
      entityType: "Notification",
      entityId: campaign.id,
      reason: `${delivery.sent}/${delivery.total} appareils notifiés`,
      after: JSON.stringify({ ...parsed.data, delivery }),
    },
  });
  return NextResponse.json({ campaign, delivery });
}
