import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  ADMIN_ACCESS_COOKIE,
  ADMIN_REFRESH_COOKIE,
  ADMIN_ROLES,
  authorizeAdminRequest,
  getSupabaseAdminConfig,
} from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const Credentials = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(256),
});

const cookieOptions = (maxAge: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
  maxAge,
});

export async function GET(request: NextRequest) {
  const authorization = await authorizeAdminRequest(request);
  if (!authorization.ok) return NextResponse.json({ user: null });
  return NextResponse.json({ user: authorization.user });
}

export async function POST(request: NextRequest) {
  const parsed = Credentials.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Identifiants incomplets ou invalides." }, { status: 400 });

  const { url, key } = getSupabaseAdminConfig();
  if (!url || !key) return NextResponse.json({ error: "La connexion professionnelle n'est pas configurée." }, { status: 503 });

  let authResponse: Response;
  try {
    authResponse = await fetch(`${url}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: key, "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return NextResponse.json({ error: "Le service d'authentification est momentanément indisponible." }, { status: 503 });
  }
  const payload = await authResponse.json();
  if (!authResponse.ok) {
    return NextResponse.json({ error: payload.error_description || payload.msg || "Identifiants invalides." }, { status: 401 });
  }

  const role = payload.user?.app_metadata?.role || payload.user?.user_metadata?.role || "";
  if (!ADMIN_ROLES.has(role)) {
    await fetch(`${url}/auth/v1/logout`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${payload.access_token}` },
      signal: AbortSignal.timeout(5_000),
    }).catch(() => undefined);
    return NextResponse.json({ error: "Ce compte ne possède aucun rôle d'administration autorisé." }, { status: 403 });
  }

  const expiresIn = Math.max(60, Math.min(Number(payload.expires_in || 3600), 86400));
  const response = NextResponse.json({
    user: { id: payload.user.id, email: payload.user.email, role },
  });
  response.cookies.set(ADMIN_ACCESS_COOKIE, payload.access_token, cookieOptions(expiresIn));
  if (payload.refresh_token) response.cookies.set(ADMIN_REFRESH_COOKIE, payload.refresh_token, cookieOptions(60 * 60 * 24 * 7));
  return response;
}

export async function DELETE(request: NextRequest) {
  const { url, key } = getSupabaseAdminConfig();
  const accessToken = request.cookies.get(ADMIN_ACCESS_COOKIE)?.value;
  if (url && key && accessToken) {
    await fetch(`${url}/auth/v1/logout`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(5_000),
    }).catch(() => undefined);
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_ACCESS_COOKIE, "", cookieOptions(0));
  response.cookies.set(ADMIN_REFRESH_COOKIE, "", cookieOptions(0));
  return response;
}
