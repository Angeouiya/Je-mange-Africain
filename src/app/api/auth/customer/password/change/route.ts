import { NextRequest, NextResponse } from "next/server";
import { changePasswordWithFreshSession, ConnectedPasswordChangeInput } from "@/lib/change-password";
import {
  authorizeCustomerRequest,
  getSupabaseCustomerConfig,
  setCustomerCookies,
  toCustomerSession,
} from "@/lib/customer-auth";
import { db } from "@/lib/db";
import { enforceRateLimit } from "@/lib/redis";
import { createAndSendUserNotification } from "@/lib/user-notifications";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest) {
  const perimeterLimited = await enforceRateLimit(request, "account", undefined, { scopes: ["ip", "route"] });
  if (perimeterLimited) return perimeterLimited;

  const customer = await authorizeCustomerRequest(request);
  if (!customer) return NextResponse.json({ error: "Votre session a expiré. Reconnectez-vous pour continuer." }, { status: 401 });
  const subjectLimited = await enforceRateLimit(request, "account", customer.id, { scopes: ["subject"] });
  if (subjectLimited) return subjectLimited;

  const parsed = ConnectedPasswordChangeInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Le nouveau mot de passe ou sa confirmation est invalide." }, { status: 400 });
  }

  const { url, key } = getSupabaseCustomerConfig();
  if (!url || !key) return NextResponse.json({ error: "Le service de sécurité est momentanément indisponible." }, { status: 503 });

  const result = await changePasswordWithFreshSession({
    url,
    key,
    email: customer.email,
    userId: customer.id,
    currentPassword: parsed.data.currentPassword,
    newPassword: parsed.data.newPassword,
    acceptsIdentity: (session) => {
      const freshCustomer = session.user ? toCustomerSession(session.user) : null;
      return freshCustomer?.id === customer.id;
    },
  });
  if (!result.ok) return passwordChangeError(result.reason);

  const directoryUser = await db.user.findUnique({
    where: { email: customer.email.toLowerCase() },
    select: { id: true },
  }).catch(() => null);
  if (directoryUser) {
    await Promise.all([
      db.auditLog.create({
        data: {
          userId: directoryUser.id,
          action: "customer_password_change",
          entityType: "User",
          entityId: directoryUser.id,
          after: JSON.stringify({ sessionPreserved: true, securityEmailRequested: true }),
          reason: "Mot de passe modifié depuis l'espace client connecté",
          ip: clientIp(request),
        },
      }).catch(() => undefined),
      createAndSendUserNotification({
        userId: directoryUser.id,
        type: "system",
        url: "/?view=account&accountSection=settings",
        tag: `password-change-${directoryUser.id}`,
        fr: {
          title: "Mot de passe modifié",
          body: "Votre mot de passe a bien été modifié. Votre session reste ouverte sur cet appareil.",
        },
        en: {
          title: "Password changed",
          body: "Your password was changed successfully. Your session remains open on this device.",
        },
      }).catch(() => undefined),
    ]);
  }

  const response = NextResponse.json({ ok: true, sessionPreserved: true, securityEmailRequested: true });
  setCustomerCookies(response, result.session as Record<string, unknown>);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function passwordChangeError(reason: "current_password" | "identity" | "rejected" | "unavailable") {
  if (reason === "current_password") return NextResponse.json({ error: "Le mot de passe actuel est incorrect." }, { status: 401 });
  if (reason === "identity") return NextResponse.json({ error: "La session ne correspond plus à ce compte." }, { status: 403 });
  if (reason === "rejected") return NextResponse.json({ error: "Ce nouveau mot de passe ne peut pas être utilisé." }, { status: 400 });
  return NextResponse.json({ error: "Le mot de passe n'a pas pu être modifié." }, { status: 503 });
}

function clientIp(request: Request) {
  return request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
}
