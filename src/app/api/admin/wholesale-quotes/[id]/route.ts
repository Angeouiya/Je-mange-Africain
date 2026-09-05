import { NextRequest, NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { canTransitionWholesaleQuote, WholesaleQuoteAdminInput } from "@/lib/wholesale-quote";
import { projectWholesaleQuote } from "@/lib/wholesale-quote-server";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await authorizeAdminRequest(request, { module: "orders", action: "update" });
  if (!authorization.ok) return authorization.response;

  const parsed = WholesaleQuoteAdminInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "La qualification du devis est invalide.", details: parsed.error.flatten() }, { status: 400 });
  const input = parsed.data;
  const isFr = input.locale === "fr";
  const { id } = await params;

  const before = await db.wholesaleQuote.findUnique({ where: { id }, include: { items: { orderBy: { createdAt: "asc" } } } });
  if (!before) return NextResponse.json({ error: isFr ? "Dossier de devis introuvable." : "Quote file not found." }, { status: 404 });
  if (!canTransitionWholesaleQuote(before.status, input.status)) {
    return NextResponse.json({ error: isFr ? "Ce changement de statut n'est pas autorisé depuis l'étape actuelle." : "This status change is not allowed from the current stage." }, { status: 409 });
  }

  try {
    const quote = await db.$transaction(async (transaction) => {
      const updated = await transaction.wholesaleQuote.update({
        where: { id },
        data: { status: input.status, adminNote: input.adminNote || null, assignedTo: input.assignedTo || null },
        include: { items: { orderBy: { createdAt: "asc" } } },
      });
      await transaction.auditLog.create({
        data: {
          action: before.status === input.status ? "wholesale_quote_update" : "wholesale_quote_status_change",
          entityType: "WholesaleQuote",
          entityId: id,
          before: JSON.stringify({ status: before.status, adminNote: before.adminNote, assignedTo: before.assignedTo }),
          after: JSON.stringify({ status: input.status, adminNote: input.adminNote, assignedTo: input.assignedTo }),
          reason: `Qualification du devis ${before.reference} par ${authorization.user.email}`,
          ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
        },
      });
      return updated;
    });
    return NextResponse.json({ quote: projectWholesaleQuote(quote) });
  } catch {
    return NextResponse.json({ error: isFr ? "Le dossier n'a pas pu être mis à jour." : "The quote file could not be updated." }, { status: 500 });
  }
}
