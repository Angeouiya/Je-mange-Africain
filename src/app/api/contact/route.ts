import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { enforceRateLimit } from "@/lib/redis";

export const dynamic = "force-dynamic";

const ContactRequest = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  subject: z.string().trim().min(3).max(180),
  message: z.string().trim().min(10).max(5_000),
});

export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, "account");
  if (limited) return limited;
  const parsed = ContactRequest.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Veuillez compléter correctement tous les champs." }, { status: 400 });
  const saved = await db.contactMessage.create({ data: parsed.data });
  return NextResponse.json({ reference: `JMA-${saved.id.slice(-8).toUpperCase()}` }, { status: 201 });
}
