import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_ROLES,
  authorizeAdminRequest,
  getSupabaseAdminConfig,
  setAdminCookies,
} from "@/lib/admin-auth";
import {
  adminRateLimitSubject,
  enforceAdminCriticalPerimeterRateLimit,
  enforceAdminCriticalSubjectRateLimit,
} from "@/lib/admin-rate-limit";
import { changePasswordWithFreshSession, ConnectedPasswordChangeInput } from "@/lib/change-password";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest) {
  const perimeterLimited = await enforceAdminCriticalPerimeterRateLimit(request, "admin-sensitive");
  if (perimeterLimited) return perimeterLimited;

  const authorization = await authorizeAdminRequest(request);
  if (!authorization.ok) return authorization.response;
  const subjectLimited = await enforceAdminCriticalSubjectRateLimit(
    request,
    "admin-sensitive",
    adminRateLimitSubject(authorization.user),
  );
  if (subjectLimited) return subjectLimited;

  const parsed = ConnectedPasswordChangeInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Le nouveau mot de passe ou sa confirmation est invalide." }, { status: 400 });
  }

  const { url, key } = getSupabaseAdminConfig();
  if (!url || !key) {
    return NextResponse.json({ error: "Le service de sécurité professionnel est momentanément indisponible." }, { status: 503 });
  }

  const result = await changePasswordWithFreshSession({
    url,
    key,
    email: authorization.user.email,
    userId: authorization.user.id,
    currentPassword: parsed.data.currentPassword,
    newPassword: parsed.data.newPassword,
    acceptsIdentity: (session) => ADMIN_ROLES.has(String(session.user?.app_metadata?.role || "")),
  });
  if (!result.ok) return passwordChangeError(result.reason);

  await db.auditLog.create({
    data: {
      action: "admin_password_change",
      entityType: "AdminIdentity",
      entityId: authorization.user.id,
      after: JSON.stringify({ sessionPreserved: true, securityEmailRequested: true }),
      reason: `Mot de passe modifié par ${authorization.user.email}`,
      ip: clientIp(request),
    },
  }).catch(() => undefined);

  const response = NextResponse.json({ ok: true, sessionPreserved: true, securityEmailRequested: true });
  setAdminCookies(response, result.session as Record<string, unknown>);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function passwordChangeError(reason: "current_password" | "identity" | "rejected" | "unavailable") {
  if (reason === "current_password") return NextResponse.json({ error: "Le mot de passe actuel est incorrect." }, { status: 401 });
  if (reason === "identity") return NextResponse.json({ error: "La session ne correspond plus à ce compte professionnel." }, { status: 403 });
  if (reason === "rejected") return NextResponse.json({ error: "Ce nouveau mot de passe ne peut pas être utilisé." }, { status: 400 });
  return NextResponse.json({ error: "Le mot de passe professionnel n'a pas pu être modifié." }, { status: 503 });
}

function clientIp(request: Request) {
  return request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
}
