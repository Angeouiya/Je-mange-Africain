import { NextRequest, NextResponse } from "next/server";
import { type AdminAction, type AdminModule, hasAdminPermission, permissionsForRole } from "@/lib/admin-permissions";

export const ADMIN_ROLES = new Set([
  "super_admin",
  "direction",
  "catalog_manager",
  "recipe_manager",
  "purchase_manager",
  "warehouse_manager",
  "logistics",
  "support",
  "marketing",
  "accounting",
]);

export const ADMIN_ACCESS_COOKIE = "jma-admin-access";
export const ADMIN_REFRESH_COOKIE = "jma-admin-refresh";

export function getSupabaseAdminConfig() {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)?.replace(/\/$/, "");
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return { url, key, serviceRoleKey };
}

export async function authorizeAdminRequest(request: NextRequest, permission?: { module: AdminModule; action?: AdminAction }) {
  const { url: supabaseUrl, key: publishableKey } = getSupabaseAdminConfig();
  const headerAuthorization = request.headers.get("authorization");
  const cookieToken = request.cookies.get(ADMIN_ACCESS_COOKIE)?.value;
  const authorization = headerAuthorization?.startsWith("Bearer ")
    ? headerAuthorization
    : cookieToken ? `Bearer ${cookieToken}` : null;

  if (!supabaseUrl || !publishableKey || !authorization?.startsWith("Bearer ")) {
    return { ok: false as const, response: NextResponse.json({ error: "Authentification administrateur requise." }, { status: 401 }) };
  }

  let response: Response;
  try {
    response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: publishableKey, Authorization: authorization },
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
  } catch {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Le service d'authentification est momentanément indisponible." }, { status: 503 }),
    };
  }
  if (!response.ok) {
    return { ok: false as const, response: NextResponse.json({ error: "Session administrateur invalide ou expirée." }, { status: 401 }) };
  }

  const user = await response.json();
  const role = user.app_metadata?.role || "";
  if (!ADMIN_ROLES.has(role)) {
    return { ok: false as const, response: NextResponse.json({ error: "Rôle administrateur insuffisant." }, { status: 403 }) };
  }
  if (permission && !hasAdminPermission(role, permission.module, permission.action || "read")) {
    return { ok: false as const, response: NextResponse.json({ error: "Votre rôle ne permet pas cette action." }, { status: 403 }) };
  }

  return {
    ok: true as const,
    accessToken: authorization.slice("Bearer ".length),
    user: { id: user.id as string, email: user.email as string, role: role as string, permissions: permissionsForRole(role) },
  };
}
