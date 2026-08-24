import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const locale = (searchParams.get("locale") as "fr" | "en") || "fr";

  const customers = await db.customer.findMany({
    include: {
      user: true,
      addresses: true,
      _count: { select: { orders: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    customers: customers.map((c) => ({
      id: c.id,
      email: c.user.email,
      name: `${c.user.firstName || ""} ${c.user.lastName || ""}`.trim() || c.user.email,
      city: c.addresses[0]?.city || "—",
      orders: c._count.orders,
      loyalty: c.loyaltyPoints,
      walletCredit: Number(c.walletCredit),
      preferredLang: c.preferredLang,
    })),
  });
}
