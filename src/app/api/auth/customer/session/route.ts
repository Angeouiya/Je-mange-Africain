import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  CUSTOMER_ACCESS_COOKIE,
  authorizeCustomerRequest,
  clearCustomerCookies,
  getSupabaseCustomerConfig,
  normalizePhone,
  setCustomerCookies,
  toCustomerSession,
} from "@/lib/customer-auth";
import { db } from "@/lib/db";
import { enforceRateLimit } from "@/lib/redis";
import { loadCustomerAccount } from "@/lib/customer-account";

export const dynamic = "force-dynamic";

const Credentials = z.object({
  identifier: z.string().trim().min(3).max(254),
  password: z.string().min(8).max(256),
});

export async function GET(request: NextRequest) {
  const customer = await authorizeCustomerRequest(request);
  if (!customer) return NextResponse.json({ customer: null });
  const account = await loadCustomerAccount(customer, true).catch(() => null);
  return NextResponse.json(account || { customer, addresses: [] }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const limited = await enforceRateLimit(request, "auth");
  if (limited) return limited;

  const parsed = Credentials.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Identifiant ou mot de passe invalide." }, { status: 400 });

  const { url, key } = getSupabaseCustomerConfig();
  if (!url || !key) return NextResponse.json({ error: "La connexion client n'est pas configurée." }, { status: 503 });

  const identifierKey = parsed.data.identifier.includes("@") ? "email" : "phone";
  const identifier = identifierKey === "phone" ? normalizePhone(parsed.data.identifier) : parsed.data.identifier.toLowerCase();
  let authResponse: Response;
  try {
    authResponse = await exchangePassword(url, key, { [identifierKey]: identifier, password: parsed.data.password });
    if (!authResponse.ok && identifierKey === "phone") {
      const directoryUser = await db.user.findFirst({
        where: { phone: identifier, role: "customer", isActive: true },
        select: { email: true },
      });
      if (directoryUser?.email) authResponse = await exchangePassword(url, key, { email: directoryUser.email, password: parsed.data.password });
    }
  } catch {
    return NextResponse.json({ error: "Le service de connexion est momentanément indisponible." }, { status: 503 });
  }

  const payload = await authResponse.json().catch(() => ({}));
  if (!authResponse.ok) return NextResponse.json({ error: "Identifiant ou mot de passe incorrect." }, { status: 401 });
  const customer = toCustomerSession(payload.user);
  if (!customer) return NextResponse.json({ error: "Ce compte doit se connecter depuis son espace dédié." }, { status: 403 });

  const account = await loadCustomerAccount(customer, true).catch(() => null);
  const response = NextResponse.json(account || { customer, addresses: [] });
  setCustomerCookies(response, payload);
  return response;
}

function exchangePassword(url: string, key: string, credentials: Record<string, string>) {
  return fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
}

export async function DELETE(request: NextRequest) {
  const { url, key } = getSupabaseCustomerConfig();
  const accessToken = request.cookies.get(CUSTOMER_ACCESS_COOKIE)?.value;
  if (url && key && accessToken) {
    await fetch(`${url}/auth/v1/logout`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(5_000),
    }).catch(() => undefined);
  }

  const response = NextResponse.json({ ok: true });
  clearCustomerCookies(response);
  return response;
}
