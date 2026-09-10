import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { authorizeCustomerRequest } from "@/lib/customer-auth";
import { DEFAULT_PUSH_PREFERENCES, pushPreferenceData } from "@/lib/push-preferences";
import { enforceRateLimit } from "@/lib/redis";

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
const SubscriptionRenewalBody = z.object({
  previousEndpoint: z.string().url().max(4096),
  subscription: SubscriptionBody.shape.subscription,
});

export async function POST(request: NextRequest) {
  const limited = await enforceRateLimit(request, "push", undefined, { scopes: ["ip"] });
  if (limited) return limited;

  const parsed = SubscriptionBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Abonnement push invalide." }, { status: 400 });

  const { subscription, deviceId, locale, preferences } = parsed.data;
  const authorization = await authorizePushDirectoryUser(request);
  if (!authorization.ok) return authorization.response;
  const userLimited = await enforceRateLimit(request, "push", authorization.userId, { scopes: ["subject"] });
  if (userLimited) return userLimited;

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
  const limited = await enforceRateLimit(request, "push", undefined, { scopes: ["ip"] });
  if (limited) return limited;

  const parsed = PreferencesUpdateBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Préférences push invalides." }, { status: 400 });

  const authorization = await authorizePushDirectoryUser(request);
  if (!authorization.ok) return authorization.response;
  const userLimited = await enforceRateLimit(request, "push", authorization.userId, { scopes: ["subject"] });
  if (userLimited) return userLimited;

  const { endpoint, deviceId, preferences } = parsed.data;
  const updated = await db.pushSubscription.updateMany({
    where: { endpoint, deviceId, userId: authorization.userId, enabled: true },
    data: { ...pushPreferenceData(preferences), lastSeenAt: new Date() },
  });
  if (!updated.count) return NextResponse.json({ error: "Abonnement push introuvable." }, { status: 404 });
  return NextResponse.json({ active: true, preferences });
}

export async function PUT(request: NextRequest) {
  const limited = await enforceRateLimit(request, "push", undefined, { scopes: ["ip"] });
  if (limited) return limited;

  const parsed = SubscriptionRenewalBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Renouvellement push invalide." }, { status: 400 });

  const authorization = await authorizePushDirectoryUser(request);
  if (!authorization.ok) return authorization.response;
  const userLimited = await enforceRateLimit(request, "push", authorization.userId, { scopes: ["subject"] });
  if (userLimited) return userLimited;

  const previous = await db.pushSubscription.findFirst({
    where: { endpoint: parsed.data.previousEndpoint, userId: authorization.userId },
  });
  if (!previous) return NextResponse.json({ error: "Ancien abonnement push introuvable." }, { status: 404 });

  const { endpoint, keys } = parsed.data.subscription;
  const renewed = await db.pushSubscription.upsert({
    where: { endpoint },
    create: {
      endpoint,
      userId: authorization.userId,
      p256dh: keys.p256dh,
      auth: keys.auth,
      deviceId: previous.deviceId,
      locale: previous.locale,
      userAgent: request.headers.get("user-agent")?.slice(0, 500) || previous.userAgent,
      enabled: true,
      failureCount: 0,
      orderAlerts: previous.orderAlerts,
      systemAlerts: previous.systemAlerts,
      recipeAlerts: previous.recipeAlerts,
      promotionAlerts: previous.promotionAlerts,
    },
    update: {
      userId: authorization.userId,
      p256dh: keys.p256dh,
      auth: keys.auth,
      deviceId: previous.deviceId,
      locale: previous.locale,
      userAgent: request.headers.get("user-agent")?.slice(0, 500) || previous.userAgent,
      enabled: true,
      failureCount: 0,
      lastSeenAt: new Date(),
      orderAlerts: previous.orderAlerts,
      systemAlerts: previous.systemAlerts,
      recipeAlerts: previous.recipeAlerts,
      promotionAlerts: previous.promotionAlerts,
    },
  });
  if (endpoint !== parsed.data.previousEndpoint) {
    await db.pushSubscription.deleteMany({
      where: { endpoint: parsed.data.previousEndpoint, userId: authorization.userId, id: { not: renewed.id } },
    });
  }

  return NextResponse.json({ id: renewed.id, active: true, renewed: true });
}

export async function DELETE(request: NextRequest) {
  const limited = await enforceRateLimit(request, "push", undefined, { scopes: ["ip"] });
  if (limited) return limited;

  const parsed = DeleteBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Abonnement push invalide." }, { status: 400 });
  const authorization = await authorizePushDirectoryUser(request);
  if (!authorization.ok) return authorization.response;
  const userLimited = await enforceRateLimit(request, "push", authorization.userId, { scopes: ["subject"] });
  if (userLimited) return userLimited;

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
