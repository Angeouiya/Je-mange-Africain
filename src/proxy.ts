import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/redis";

const ADMIN_DOMAIN = "admin.je-mange-africain.com";
const CUSTOMER_DOMAIN = "je-mange-africain.com";
const WWW_CUSTOMER_DOMAIN = "www.je-mange-africain.com";
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);

function requestHost(request: NextRequest) {
  const hostHeader = (request.headers.get("host") || "").toLowerCase();
  if (hostHeader.startsWith("[::1]")) return "::1";
  return hostHeader.split(":")[0];
}

function isAdminSurfacePath(pathname: string) {
  return pathname === "/admin" || pathname.startsWith("/admin/") || pathname === "/api/admin" || pathname.startsWith("/api/admin/");
}

function isApiSurfacePath(pathname: string) {
  return pathname === "/api" || pathname.startsWith("/api/");
}

export async function proxy(request: NextRequest) {
  const host = requestHost(request);
  const { pathname } = request.nextUrl;

  if (host === ADMIN_DOMAIN && pathname === "/") {
    return NextResponse.rewrite(new URL("/admin", request.url));
  }

  if (host !== ADMIN_DOMAIN && !LOCAL_HOSTS.has(host) && isAdminSurfacePath(pathname)) {
    const adminUrl = request.nextUrl.clone();
    adminUrl.protocol = "https";
    adminUrl.hostname = ADMIN_DOMAIN;
    adminUrl.port = "";
    return NextResponse.redirect(adminUrl);
  }

  if (host === WWW_CUSTOMER_DOMAIN) {
    const customerUrl = request.nextUrl.clone();
    customerUrl.protocol = "https";
    customerUrl.hostname = CUSTOMER_DOMAIN;
    customerUrl.port = "";
    return NextResponse.redirect(customerUrl);
  }

  if (isApiSurfacePath(pathname) && request.method !== "OPTIONS") {
    const limited = await enforceRateLimit(request, "api-gateway", undefined, { scopes: ["ip", "route", "global"] });
    if (limited) return limited;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo-jma.png).*)"],
};
