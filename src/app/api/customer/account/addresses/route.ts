import { NextRequest, NextResponse } from "next/server";
import { authorizeCustomerRequest } from "@/lib/customer-auth";
import { customerAddressInput, loadCustomerAccount } from "@/lib/customer-account";
import { db } from "@/lib/db";
import { enforceRateLimit } from "@/lib/redis";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const session = await authorizeCustomerRequest(request);
  if (!session) return NextResponse.json({ error: "Authentification client requise." }, { status: 401 });
  const limited = await enforceRateLimit(request, "account", session.id);
  if (limited) return limited;
  const body = await request.json().catch(() => null);
  const parsed = customerAddressInput.safeParse(body);
  const isEn = body?.locale === "en";
  if (!parsed.success) return NextResponse.json({ error: isEn ? "Please check the address details." : "Veuillez vérifier l'adresse saisie." }, { status: 400 });

  const account = await loadCustomerAccount(session, true).catch(() => null);
  if (!account) return NextResponse.json({ error: isEn ? "Customer account not found or inactive." : "Compte client introuvable ou inactif." }, { status: 404 });
  if (account.addresses.length >= 10) return NextResponse.json({ error: isEn ? "The address book is limited to 10 addresses." : "Le carnet est limité à 10 adresses." }, { status: 409 });

  const makeDefault = parsed.data.isDefault || account.addresses.length === 0;
  const { locale: _locale, ...addressData } = parsed.data;
  await db.$transaction(async (transaction) => {
    if (makeDefault) await transaction.address.updateMany({ where: { customerId: account.customerId }, data: { isDefault: false } });
    await transaction.address.create({ data: { ...addressData, isDefault: makeDefault, customerId: account.customerId } });
  });

  const updated = await loadCustomerAccount(session);
  if (!updated) return NextResponse.json({ error: isEn ? "The address book could not be reloaded." : "Le carnet d'adresses n'a pas pu être rechargé." }, { status: 500 });
  return NextResponse.json(updated, { status: 201, headers: { "Cache-Control": "no-store" } });
}
