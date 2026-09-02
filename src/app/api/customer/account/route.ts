import { after, NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { CUSTOMER_ACCESS_COOKIE, authorizeCustomerRequest, getSupabaseCustomerConfig, normalizePhone } from "@/lib/customer-auth";
import { loadCustomerAccount } from "@/lib/customer-account";
import { db } from "@/lib/db";
import { enforceRateLimit } from "@/lib/redis";

export const dynamic = "force-dynamic";

const ProfileUpdate = z.object({
  firstName: z.string().trim().min(2).max(80).optional(),
  lastName: z.string().trim().min(2).max(80).optional(),
  phone: z.string().trim().transform(normalizePhone).pipe(z.string().regex(/^\+[1-9]\d{7,14}$/)).optional(),
  preferredLang: z.enum(["fr", "en"]).optional(),
}).refine((value) => Object.values(value).some((item) => item !== undefined), { message: "Aucune modification transmise." });

export async function GET(request: NextRequest) {
  const session = await authorizeCustomerRequest(request);
  if (!session) return NextResponse.json({ error: "Authentification client requise." }, { status: 401 });
  const account = await loadCustomerAccount(session, true).catch(() => null);
  if (!account) return NextResponse.json({ error: "Compte client introuvable ou inactif." }, { status: 404 });
  return NextResponse.json(account, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: NextRequest) {
  const session = await authorizeCustomerRequest(request);
  if (!session) return NextResponse.json({ error: "Authentification client requise." }, { status: 401 });
  const limited = await enforceRateLimit(request, "account", session.id);
  if (limited) return limited;
  const body = await request.json().catch(() => null);
  const parsed = ProfileUpdate.safeParse(body);
  const isEn = body?.preferredLang === "en";
  if (!parsed.success) return NextResponse.json({ error: isEn ? "Please check your profile details." : "Veuillez vérifier les informations du profil." }, { status: 400 });

  const account = await loadCustomerAccount(session, true).catch(() => null);
  if (!account) return NextResponse.json({ error: isEn ? "Customer account not found or inactive." : "Compte client introuvable ou inactif." }, { status: 404 });

  if (parsed.data.phone) {
    const duplicate = await db.user.findFirst({ where: { phone: parsed.data.phone, id: { not: account.userId } }, select: { id: true } });
    if (duplicate) return NextResponse.json({ error: isEn ? "This phone number is already in use." : "Ce numéro de téléphone est déjà utilisé." }, { status: 409 });
  }

  await db.$transaction([
    db.user.update({
      where: { id: account.userId },
      data: {
        ...(parsed.data.firstName ? { firstName: parsed.data.firstName } : {}),
        ...(parsed.data.lastName ? { lastName: parsed.data.lastName } : {}),
        ...(parsed.data.phone ? { phone: parsed.data.phone } : {}),
      },
    }),
    db.customer.update({
      where: { id: account.customerId },
      data: parsed.data.preferredLang ? { preferredLang: parsed.data.preferredLang } : {},
    }),
  ]);

  const { url, key } = getSupabaseCustomerConfig();
  const accessToken = request.cookies.get(CUSTOMER_ACCESS_COOKIE)?.value;
  after(() => syncAuthMetadata({ url, key, accessToken }, session, parsed.data));
  const updated = await loadCustomerAccount({
    ...session,
    firstName: parsed.data.firstName || session.firstName,
    lastName: parsed.data.lastName || session.lastName,
    phone: parsed.data.phone || session.phone,
  });
  if (!updated) return NextResponse.json({ error: isEn ? "The profile could not be reloaded." : "Le profil n'a pas pu être rechargé." }, { status: 500 });
  return NextResponse.json(updated, { headers: { "Cache-Control": "no-store" } });
}

async function syncAuthMetadata(configuration: { url?: string; key?: string; accessToken?: string }, session: { id: string; firstName: string; lastName: string; phone: string }, update: z.infer<typeof ProfileUpdate>) {
  const { url, key, accessToken } = configuration;
  if (!url || !key || !accessToken) return;
  await fetch(`${url}/auth/v1/user`, {
    method: "PUT",
    headers: { apikey: key, Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      data: {
        first_name: update.firstName || session.firstName,
        last_name: update.lastName || session.lastName,
        phone: update.phone || session.phone,
      },
    }),
    signal: AbortSignal.timeout(8_000),
  }).catch(() => undefined);
}
