import { NextRequest, NextResponse } from "next/server";

export const CUSTOMER_ACCESS_COOKIE = "jma-customer-access";
export const CUSTOMER_REFRESH_COOKIE = "jma-customer-refresh";

export function normalizePhone(value: string) {
  const compact = value.replace(/[\s().-]/g, "");
  return compact.startsWith("00") ? `+${compact.slice(2)}` : compact;
}

export type CustomerSession = {
  id: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  role: "customer";
  loyaltyPoints: number;
  walletCredit: number;
};

type SupabaseUser = {
  id: string;
  email?: string;
  phone?: string;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
};

export function getSupabaseCustomerConfig() {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)?.replace(/\/$/, "");
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return { url, key, serviceRoleKey };
}

export const customerCookieOptions = (maxAge: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
  maxAge,
});

export function toCustomerSession(user: SupabaseUser): CustomerSession | null {
  const metadata = user.user_metadata || {};
  const role = String(user.app_metadata?.role || metadata.role || "customer");
  if (role !== "customer") return null;

  const email = String(user.email || metadata.email || "");
  const fallbackName = email.split("@")[0] || "Client";
  return {
    id: user.id,
    email,
    phone: String(user.phone || metadata.phone || ""),
    firstName: String(metadata.first_name || metadata.firstName || fallbackName),
    lastName: String(metadata.last_name || metadata.lastName || ""),
    role: "customer",
    loyaltyPoints: Number(metadata.loyalty_points || 0),
    walletCredit: Number(metadata.wallet_credit || 0),
  };
}

export function setCustomerCookies(response: NextResponse, payload: Record<string, unknown>) {
  const accessToken = String(payload.access_token || "");
  const refreshToken = String(payload.refresh_token || "");
  const expiresIn = Math.max(60, Math.min(Number(payload.expires_in || 3600), 86400));
  if (accessToken) response.cookies.set(CUSTOMER_ACCESS_COOKIE, accessToken, customerCookieOptions(expiresIn));
  if (refreshToken) response.cookies.set(CUSTOMER_REFRESH_COOKIE, refreshToken, customerCookieOptions(60 * 60 * 24 * 30));
}

export function clearCustomerCookies(response: NextResponse) {
  response.cookies.set(CUSTOMER_ACCESS_COOKIE, "", customerCookieOptions(0));
  response.cookies.set(CUSTOMER_REFRESH_COOKIE, "", customerCookieOptions(0));
}

async function fetchUser(url: string, key: string, accessToken: string) {
  return fetch(`${url}/auth/v1/user`, {
    headers: { apikey: key, Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });
}

export async function authorizeCustomerRequest(request: NextRequest) {
  const { url, key } = getSupabaseCustomerConfig();
  const accessToken = request.cookies.get(CUSTOMER_ACCESS_COOKIE)?.value;
  if (!url || !key || !accessToken) return null;

  try {
    const authResponse = await fetchUser(url, key, accessToken);
    if (!authResponse.ok) return null;
    return toCustomerSession(await authResponse.json());
  } catch {
    return null;
  }
}
