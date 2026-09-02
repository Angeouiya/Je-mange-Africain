import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseCustomerConfig } from "@/lib/customer-auth";

export const dynamic = "force-dynamic";

const Recovery = z.object({ email: z.string().trim().email().max(254) });
const Reset = z.object({ accessToken: z.string().min(20), password: z.string().min(8).max(256) });

export async function POST(request: Request) {
  const parsed = Recovery.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Adresse e-mail invalide." }, { status: 400 });
  const { url, key } = getSupabaseCustomerConfig();
  if (!url || !key) return NextResponse.json({ error: "Le service de récupération est momentanément indisponible." }, { status: 503 });

  try {
    await fetch(`${url}/auth/v1/recover`, {
      method: "POST",
      headers: { apikey: key, "Content-Type": "application/json" },
      body: JSON.stringify({
        email: parsed.data.email,
        redirect_to: `${process.env.NEXT_PUBLIC_SITE_URL || "https://je-mange-africain.com"}/auth/reset`,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Le service de récupération est momentanément indisponible." }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  const parsed = Reset.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Lien invalide ou nouveau mot de passe insuffisant." }, { status: 400 });
  const { url, key } = getSupabaseCustomerConfig();
  if (!url || !key) return NextResponse.json({ error: "Le service de modification du mot de passe est momentanément indisponible." }, { status: 503 });

  try {
    const response = await fetch(`${url}/auth/v1/user`, {
      method: "PUT",
      headers: { apikey: key, Authorization: `Bearer ${parsed.data.accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ password: parsed.data.password }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return NextResponse.json({ error: "Ce lien n'est plus valide. Demandez-en un nouveau." }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Le mot de passe n'a pas pu être modifié." }, { status: 503 });
  }
}
