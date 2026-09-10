import { NextResponse } from "next/server";
import { z } from "zod";
import { ADMIN_ROLES, getSupabaseAdminConfig } from "@/lib/admin-auth";
import { enforceRateLimit } from "@/lib/redis";

export const dynamic = "force-dynamic";

const ADMIN_RESET_URL = "https://admin.je-mange-africain.com/admin/reset";
const WORKERS_DEV_HOST = "je-mange-africain.promise-corporation.workers.dev";
const Recovery = z.object({ email: z.string().trim().email().max(254) });
const Reset = z.object({ accessToken: z.string().min(20), password: z.string().min(8).max(256) });

export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, "password-reset", undefined, { scopes: ["ip", "global"] });
  if (limited) return limited;

  const parsed = Recovery.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Adresse e-mail invalide." }, { status: 400 });
  const identityLimited = await enforceRateLimit(request, "password-reset", parsed.data.email.toLowerCase(), { scopes: ["subject"] });
  if (identityLimited) return identityLimited;

  const { url, key } = getSupabaseAdminConfig();
  if (!url || !key) return NextResponse.json({ error: "Le service de récupération professionnel est momentanément indisponible." }, { status: 503 });

  try {
    const response = await fetch(`${url}/auth/v1/recover`, {
      method: "POST",
      headers: { apikey: key, "Content-Type": "application/json" },
      body: JSON.stringify({ email: parsed.data.email, redirect_to: adminResetRedirectUrl(request) }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      return NextResponse.json({ error: "Le service de récupération professionnel est momentanément indisponible." }, { status: 503 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Le service de récupération professionnel est momentanément indisponible." }, { status: 503 });
  }
}

function adminResetRedirectUrl(request: Request) {
  try {
    const url = new URL(request.url);
    if (url.protocol === "https:" && url.hostname.toLowerCase() === WORKERS_DEV_HOST) {
      url.pathname = "/admin/reset";
      url.search = "";
      url.hash = "";
      return url.toString();
    }
  } catch {
    // Use the custom admin domain once DNS is delegated.
  }
  return ADMIN_RESET_URL;
}

export async function PUT(request: Request) {
  const limited = await enforceRateLimit(request, "password-reset", undefined, { scopes: ["ip"] });
  if (limited) return limited;

  const parsed = Reset.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Lien invalide ou nouveau mot de passe insuffisant." }, { status: 400 });
  const { url, key } = getSupabaseAdminConfig();
  if (!url || !key) return NextResponse.json({ error: "Le service de modification du mot de passe est momentanément indisponible." }, { status: 503 });

  const headers = { apikey: key, Authorization: `Bearer ${parsed.data.accessToken}`, "Content-Type": "application/json" };
  try {
    const identityResponse = await fetch(`${url}/auth/v1/user`, {
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    const identity = await identityResponse.json().catch(() => null);
    if (!identityResponse.ok || !ADMIN_ROLES.has(identity?.app_metadata?.role || "")) {
      return NextResponse.json({ error: "Ce lien ne correspond pas à un compte professionnel autorisé." }, { status: 403 });
    }

    const response = await fetch(`${url}/auth/v1/user`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ password: parsed.data.password }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return NextResponse.json({ error: "Ce lien n'est plus valide. Demandez-en un nouveau." }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Le mot de passe professionnel n'a pas pu être modifié." }, { status: 503 });
  }
}
