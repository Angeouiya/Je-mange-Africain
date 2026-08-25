import { NextResponse } from "next/server";

export function teamConfigurationError() {
  return NextResponse.json({ error: "La clé serveur Supabase doit être configurée pour administrer l'équipe sans exposer de privilèges dans le navigateur.", code: "TEAM_SERVICE_NOT_CONFIGURED" }, { status: 503 });
}

export async function supabaseAuthAdminFetch(path: string, serviceRoleKey: string, url: string, init?: RequestInit) {
  return fetch(`${url}/auth/v1/admin${path}`, {
    ...init,
    headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}`, "Content-Type": "application/json", ...(init?.headers || {}) },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
}
