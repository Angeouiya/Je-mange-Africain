import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseCustomerConfig, normalizePhone, setCustomerCookies, toCustomerSession } from "@/lib/customer-auth";
import { db } from "@/lib/db";
import { PRIVACY_VERSION, TERMS_VERSION } from "@/lib/legal";
import { enforceRateLimit } from "@/lib/redis";
import { loadCustomerAccount } from "@/lib/customer-account";

export const dynamic = "force-dynamic";

const Registration = z.object({
  firstName: z.string().trim().min(2).max(80),
  lastName: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  phone: z.string().trim().transform(normalizePhone).pipe(z.string().regex(/^\+[1-9]\d{7,14}$/)),
  password: z.string().min(8).max(256),
  confirmPassword: z.string().min(8).max(256),
  termsAccepted: z.literal(true),
  privacyAccepted: z.literal(true),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas.",
  path: ["confirmPassword"],
});

export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, "register");
  if (limited) return limited;

  const parsed = Registration.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Veuillez vérifier toutes les informations saisies." }, { status: 400 });

  const { url, key, serviceRoleKey } = getSupabaseCustomerConfig();
  if (!url || !key) return NextResponse.json({ error: "Le service d'inscription est momentanément indisponible." }, { status: 503 });

  const existingDirectoryEntry = await db.user.findFirst({
    where: { OR: [{ phone: parsed.data.phone }, { email: parsed.data.email }] },
    select: { id: true },
  });
  if (existingDirectoryEntry) return NextResponse.json({ error: "Un compte utilise déjà cet e-mail ou ce numéro." }, { status: 409 });

  const acceptedAt = new Date().toISOString();

  const metadata = {
    first_name: parsed.data.firstName,
    last_name: parsed.data.lastName,
    phone: parsed.data.phone,
    role: "customer",
    terms_version: TERMS_VERSION,
    privacy_version: PRIVACY_VERSION,
    legal_accepted_at: acceptedAt,
  };

  try {
    if (serviceRoleKey) {
      const createResponse = await fetch(`${url}/auth/v1/admin/users`, {
        method: "POST",
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: parsed.data.email,
          phone: parsed.data.phone,
          password: parsed.data.password,
          email_confirm: true,
          phone_confirm: true,
          user_metadata: metadata,
          app_metadata: { role: "customer" },
        }),
        signal: AbortSignal.timeout(10_000),
      });
      const created = await createResponse.json().catch(() => ({}));
      if (!createResponse.ok) {
        const duplicate = String(created.msg || created.message || "").toLowerCase().includes("already");
        return NextResponse.json({ error: duplicate ? "Un compte utilise déjà cet e-mail ou ce numéro." : "Inscription impossible avec ces informations." }, { status: 409 });
      }
    } else {
      const signupResponse = await fetch(`${url}/auth/v1/signup`, {
        method: "POST",
        headers: { apikey: key, "Content-Type": "application/json" },
        body: JSON.stringify({ email: parsed.data.email, password: parsed.data.password, data: metadata }),
        signal: AbortSignal.timeout(10_000),
      });
      const signupPayload = await signupResponse.json().catch(() => ({}));
      if (!signupResponse.ok) return NextResponse.json({ error: "Un compte utilise déjà cet e-mail ou les informations sont invalides." }, { status: 409 });
      if (!signupPayload.user || (Array.isArray(signupPayload.user.identities) && signupPayload.user.identities.length === 0)) {
        return NextResponse.json({ error: "Un compte utilise déjà cet e-mail ou ce numéro." }, { status: 409 });
      }
      await saveCustomerDirectory(parsed.data, acceptedAt);
      if (signupPayload.access_token) {
        const customer = toCustomerSession(signupPayload.user);
        const account = customer ? await loadCustomerAccount(customer, true).catch(() => null) : null;
        const response = NextResponse.json({ ...(account || { customer, addresses: [] }), requiresEmailConfirmation: false });
        setCustomerCookies(response, signupPayload);
        return response;
      }
      return NextResponse.json({ customer: null, requiresEmailConfirmation: true });
    }

    await saveCustomerDirectory(parsed.data, acceptedAt);

    const tokenResponse = await fetch(`${url}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: key, "Content-Type": "application/json" },
      body: JSON.stringify({ email: parsed.data.email, password: parsed.data.password }),
      signal: AbortSignal.timeout(10_000),
    });
    const tokenPayload = await tokenResponse.json().catch(() => ({}));
    if (!tokenResponse.ok) return NextResponse.json({ error: "Compte créé. La connexion doit être renouvelée." }, { status: 409 });
    const customer = toCustomerSession(tokenPayload.user);
    const account = customer ? await loadCustomerAccount(customer, true).catch(() => null) : null;
    const response = NextResponse.json({ ...(account || { customer, addresses: [] }), requiresEmailConfirmation: false });
    setCustomerCookies(response, tokenPayload);
    return response;
  } catch {
    return NextResponse.json({ error: "Le service d'inscription est momentanément indisponible." }, { status: 503 });
  }
}

async function saveCustomerDirectory(data: z.infer<typeof Registration>, acceptedAt: string) {
  await db.user.create({
    data: {
      email: data.email,
      phone: data.phone,
      firstName: data.firstName,
      lastName: data.lastName,
      role: "customer",
      isActive: true,
      legalConsents: {
        create: {
          termsVersion: TERMS_VERSION,
          privacyVersion: PRIVACY_VERSION,
          termsAcceptedAt: new Date(acceptedAt),
          privacyAcceptedAt: new Date(acceptedAt),
          source: "customer_registration",
        },
      },
    },
  });
}
