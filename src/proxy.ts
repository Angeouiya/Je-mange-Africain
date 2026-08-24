import { NextRequest, NextResponse } from "next/server";

const CLIENT_DOMAIN = "je-mange-africain.com";
const ADMIN_DOMAIN = "admin.je-mange-africain.com";

export function proxy(request: NextRequest) {
  const host = (request.headers.get("host") || "").split(":")[0].toLowerCase();
  const { pathname } = request.nextUrl;

  if (host === ADMIN_DOMAIN && pathname === "/") {
    return NextResponse.rewrite(new URL("/admin", request.url));
  }

  if ((host === CLIENT_DOMAIN || host === `www.${CLIENT_DOMAIN}`) && pathname.startsWith("/admin")) {
    return NextResponse.redirect(new URL("https://admin.je-mange-africain.com"));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo-jma.png).*)"],
};
