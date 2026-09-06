import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { authorizeCustomerRequest } from "@/lib/customer-auth";
import { DEFAULT_PUSH_PREFERENCES, pushPreferenceData } from "@/lib/push-preferences";

export const dynamic = "force-dynamic";

const PreferencesBody = z.object({
  order: z.boolean(),
  system: z.boolean(),
  recipe: z.boolean(),
  promotion: z.boolean(),
});

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
  preferences: PreferencesBody.default(DEFAULT_PUSH_PREFERENCES),
});

const DeleteBody = z.object({ endpoint: z.string().url().max(4096) });
const PreferencesUpdateBody = z.object({
  endpoint: z.string().url().max(4096),
  deviceId: z.string().min(8).max(128),
  preferences: PreferencesBody,
});

export async function POST(request: NextRequest) {
  const parsed = SubscriptionBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Abonnement push invalide." }, { status: 400 });

  const { subscription, deviceId, locale, preferences } = parsed.data;
  const authorization = await authorizePushDirectoryUser(request);
  if (!authorization.ok) return authorization.response;
  const saved = await db.pushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    create: {
      endpoint: subscription.endpoint,
      userId: authorization.userId,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      deviceId,
      locale,
      userAgent: request.headers.get("user-agent")?.slice(0, 500),
      ...pushPreferenceData(preferences),
    },
    update: {
      userId: authorization.userId,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      deviceId,
      locale,
      enabled: true,
      failureCount: 0,
      lastSeenAt: new Date(),
      userAgent: request.headers.get("user-agent")?.slice(0, 500),
      ...pushPreferenceData(preferences),
    },
  });

  return NextResponse.json({ id: saved.id, active: true, preferences });
}

export async function PATCH(request: NextRequest) {
  const parsed = PreferencesUpdateBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Préférences push invalides." }, { status: 400 });

  const authorization = await authorizePushDirectoryUser(request);
  if (!authorization.ok) return authorization.response;
  const { endpoint, deviceId, preferences } = parsed.data;
  const updated = await db.pushSubscription.updateMany({
    where: { endpoint, deviceId, userId: authorization.userId, enabled: true },
    data: { ...pushPreferenceData(preferences), lastSeenAt: new Date() },
  });
  if (!updated.count) return NextResponse.json({ error: "Abonnement push introuvable." }, { status: 404 });
  return NextResponse.json({ active: true, preferences });
}

export async function DELETE(request: NextRequest) {
  const parsed = DeleteBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Abonnement push invalide." }, { status: 400 });
  const authorization = await authorizePushDirectoryUser(request);
  if (!authorization.ok) return authorization.response;
  await db.pushSubscription.deleteMany({ where: { endpoint: parsed.data.endpoint, userId: authorization.userId } });
  return NextResponse.json({ active: false });
}

async function authorizePushDirectoryUser(request: NextRequest) {
  const customer = await authorizeCustomerRequest(request);
  if (!customer) return { ok: false as const, response: NextResponse.json({ error: "Authentification client requise." }, { status: 401 }) };
  const directoryUser = await db.user.findUnique({ where: { email: customer.email.toLowerCase() }, select: { id: true } });
  if (!directoryUser) return { ok: false as const, response: NextResponse.json({ error: "Compte client introuvable." }, { status: 403 }) };
  return { ok: true as const, userId: directoryUser.id };
}
