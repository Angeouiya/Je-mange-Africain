import { NextRequest, NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { projectWholesaleQuote } from "@/lib/wholesale-quote-server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authorization = await authorizeAdminRequest(request, { module: "orders", action: "read" });
  if (!authorization.ok) return authorization.response;

  try {
    const quotes = await db.wholesaleQuote.findMany({ include: { items: { orderBy: { createdAt: "asc" } } }, orderBy: { createdAt: "desc" } });
    return NextResponse.json({ quotes: quotes.map(projectWholesaleQuote), generatedAt: new Date().toISOString() });
  } catch {
    return NextResponse.json({ error: "Le registre des devis de gros est momentanément indisponible." }, { status: 503 });
  }
}
