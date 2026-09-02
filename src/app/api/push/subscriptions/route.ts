import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { authorizeCustomerRequest } from "@/lib/customer-auth";

export const dynamic = "force-dynamic";

const SubscriptionBody = z.object({
  subscription: z.object({
    endpoint: z.string().url().max(4096),
    keys: z.object({
      p256dh: z.string().min(20).max(512),
      auth: z.string().min(8).max(256),
    }),
  }),
  deviceId: z.string().min(8).max(128),
  locale: z.enum(["fr", "en"]).default("fr"),
});

const DeleteBody = z.object({ endpoint: z.string().url().max(4096) });

export async function POST(request: NextRequest) {
  const parsed = SubscriptionBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Abonnement push invalide." }, { status: 400 });

  const { subscription, deviceId, locale } = parsed.data;
  const customer = await authorizeCustomerRequest(request);
  const directoryUser = customer
    ? await db.user.findUnique({ where: { email: customer.email.toLowerCase() }, select: { id: true } })
    : null;
  const saved = await db.pushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    create: {
      endpoint: subscription.endpoint,
      userId: directoryUser?.id || null,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      deviceId,
      locale,
      userAgent: request.headers.get("user-agent")?.slice(0, 500),
    },
    update: {
      userId: directoryUser?.id || null,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      deviceId,
      locale,
      enabled: true,
      failureCount: 0,
      lastSeenAt: new Date(),
      userAgent: request.headers.get("user-agent")?.slice(0, 500),
    },
  });

  return NextResponse.json({ id: saved.id, active: true });
}

export async function DELETE(request: NextRequest) {
  const parsed = DeleteBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Abonnement push invalide." }, { status: 400 });
  await db.pushSubscription.deleteMany({ where: { endpoint: parsed.data.endpoint } });
  return NextResponse.json({ active: false });
}
