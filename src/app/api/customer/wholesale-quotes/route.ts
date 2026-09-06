import { NextRequest, NextResponse } from "next/server";
import { loadCustomerIdentity } from "@/lib/customer-account";
import { authorizeCustomerRequest } from "@/lib/customer-auth";
import { db } from "@/lib/db";
import { projectCustomerWholesaleQuote } from "@/lib/wholesale-quote-server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await authorizeCustomerRequest(request);
  if (!session) return NextResponse.json({ error: "Authentification client requise." }, { status: 401 });

  try {
    const identity = await loadCustomerIdentity(session);
    if (!identity) return NextResponse.json({ error: "Compte client introuvable ou inactif." }, { status: 404 });
    const quotes = await db.wholesaleQuote.findMany({
      where: { customerId: identity.customerId },
      include: { items: { orderBy: { createdAt: "asc" } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(
      { quotes: quotes.map(projectCustomerWholesaleQuote), generatedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json({ error: "Le suivi des devis est momentanément indisponible." }, { status: 503 });
  }
}
