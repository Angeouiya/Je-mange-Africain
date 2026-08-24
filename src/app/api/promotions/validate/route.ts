import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { code, subtotal } = await req.json();
  if (!code) return NextResponse.json({ valid: false, error: "Code requis" });

  const promo = await db.promotion.findUnique({ where: { code: (code as string).toUpperCase() } });
  if (!promo || !promo.active) {
    return NextResponse.json({ valid: false, error: "Code invalide" });
  }
  const now = new Date();
  if (promo.startsAt && now < promo.startsAt) return NextResponse.json({ valid: false, error: "Promotion pas encore active" });
  if (promo.endsAt && now > promo.endsAt) return NextResponse.json({ valid: false, error: "Promotion expirée" });
  if (Number(subtotal) < Number(promo.minOrder)) {
    return NextResponse.json({ valid: false, error: `Minimum ${Number(promo.minOrder)} €` });
  }

  let discount = 0;
  if (promo.type === "percent") discount = (Number(subtotal) * Number(promo.value)) / 100;
  else if (promo.type === "fixed") discount = Number(promo.value);

  return NextResponse.json({
    valid: true,
    code: promo.code,
    type: promo.type,
    value: Number(promo.value),
    discount,
    freeShipping: promo.type === "free_shipping",
  });
}
