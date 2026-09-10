import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authorizeCustomerRequest } from "@/lib/customer-auth";
import { enforceRateLimit } from "@/lib/redis";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const limited = await enforceRateLimit(req, "push", undefined, { scopes: ["ip"] });
  if (limited) return limited;

  const locale = new URL(req.url).searchParams.get("locale") === "en" ? "en" : "fr";
  const customer = await authorizeCustomerRequest(req);
  if (!customer) return NextResponse.json({ error: "Authentification client requise." }, { status: 401 });
  const customerLimited = await enforceRateLimit(req, "push", customer.id, { scopes: ["subject"] });
  if (customerLimited) return customerLimited;

  const directoryUser = await db.user.findUnique({ where: { email: customer.email.toLowerCase() }, select: { id: true } });
  const stored = await db.notification.findMany({
    where: {
      channel: { in: ["web", "push"] },
      ...(directoryUser ? { OR: [{ userId: null }, { userId: directoryUser.id }] } : { userId: null }),
    },
    orderBy: { createdAt: "desc" },
    take: 12,
  });
  return NextResponse.json({
    notifications: stored.map((notification) => ({
      id: notification.id,
      type: notification.type,
      title: locale === "en" ? notification.titleEn : notification.titleFr,
      body: locale === "en" ? notification.bodyEn : notification.bodyFr,
      url: notification.url,
      createdAt: notification.createdAt,
    })),
  }, { headers: { "Cache-Control": "private, no-store" } });
}
