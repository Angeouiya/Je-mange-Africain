import { NextRequest, NextResponse } from "next/server";
import { authorizeCustomerRequest } from "@/lib/customer-auth";
import { customerAddressInput, loadCustomerAccount } from "@/lib/customer-account";
import { db } from "@/lib/db";
import { enforceRateLimit } from "@/lib/redis";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await authorizeCustomerRequest(request);
  if (!session) return NextResponse.json({ error: "Authentification client requise." }, { status: 401 });
  const limited = await enforceRateLimit(request, "account", session.id);
  if (limited) return limited;
  const body = await request.json().catch(() => null);
  const parsed = customerAddressInput.safeParse(body);
  const isEn = body?.locale === "en";
  if (!parsed.success) return NextResponse.json({ error: isEn ? "Please check the address details." : "Veuillez vérifier l'adresse saisie." }, { status: 400 });

  const account = await loadCustomerAccount(session, true).catch(() => null);
  const { id } = await params;
  const currentAddress = account?.addresses.find((address) => address.id === id);
  if (!account || !currentAddress) return NextResponse.json({ error: isEn ? "Address not found." : "Adresse introuvable." }, { status: 404 });

  const { locale: _locale, ...addressData } = parsed.data;
  const keepDefault = addressData.isDefault || currentAddress.isDefault || account.addresses.length === 1;
  await db.$transaction(async (transaction) => {
    if (addressData.isDefault) await transaction.address.updateMany({ where: { customerId: account.customerId }, data: { isDefault: false } });
    await transaction.address.update({ where: { id }, data: { ...addressData, isDefault: keepDefault } });
  });

  const updated = await loadCustomerAccount(session);
  if (!updated) return NextResponse.json({ error: isEn ? "The address book could not be reloaded." : "Le carnet d'adresses n'a pas pu être rechargé." }, { status: 500 });
  return NextResponse.json(updated, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await authorizeCustomerRequest(request);
  if (!session) return NextResponse.json({ error: "Authentification client requise." }, { status: 401 });
  const limited = await enforceRateLimit(request, "account", session.id);
  if (limited) return limited;
  const account = await loadCustomerAccount(session, true).catch(() => null);
  const { id } = await params;
  const isEn = new URL(request.url).searchParams.get("locale") === "en";
  const address = account?.addresses.find((item) => item.id === id);
  if (!account || !address) return NextResponse.json({ error: isEn ? "Address not found." : "Adresse introuvable." }, { status: 404 });

  await db.$transaction(async (transaction) => {
    await transaction.address.delete({ where: { id } });
    if (address.isDefault) {
      const replacement = await transaction.address.findFirst({ where: { customerId: account.customerId }, orderBy: { createdAt: "asc" }, select: { id: true } });
      if (replacement) await transaction.address.update({ where: { id: replacement.id }, data: { isDefault: true } });
    }
  });

  const updated = await loadCustomerAccount(session);
  if (!updated) return NextResponse.json({ error: isEn ? "The address book could not be reloaded." : "Le carnet d'adresses n'a pas pu être rechargé." }, { status: 500 });
  return NextResponse.json(updated, { headers: { "Cache-Control": "no-store" } });
}
