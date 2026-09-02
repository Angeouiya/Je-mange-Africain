import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authorizeCustomerRequest } from "@/lib/customer-auth";

export const dynamic = "force-dynamic";

const FALLBACK_NOTIFICATIONS = [
  {
    id: "recipe-library",
    type: "recipe",
    titleFr: "La bibliothèque culinaire s'agrandit",
    titleEn: "The culinary library is growing",
    bodyFr: "Découvrez de nouveaux plats ivoiriens et africains avec ingrédients et préparation détaillée.",
    bodyEn: "Discover new Ivorian and African dishes with detailed ingredients and preparation.",
    url: "/?view=recipes&recipeMode=library",
    createdAt: "2026-08-24T12:00:00.000Z",
  },
  {
    id: "welcome-offer",
    type: "promotion",
    titleFr: "Bienvenue chez Je mange Africain",
    titleEn: "Welcome to Je mange Africain",
    bodyFr: "Le code BIENVENUE10 vous offre 10 % dès 30 € d'achat.",
    bodyEn: "Use BIENVENUE10 for 10% off orders over €30.",
    url: "/?view=catalog",
    createdAt: "2026-08-23T09:00:00.000Z",
  },
];

export async function GET(req: NextRequest) {
  const locale = new URL(req.url).searchParams.get("locale") === "en" ? "en" : "fr";
  const customer = await authorizeCustomerRequest(req);
  const directoryUser = customer
    ? await db.user.findUnique({ where: { email: customer.email.toLowerCase() }, select: { id: true } })
    : null;
  const stored = await db.notification.findMany({
    where: {
      channel: { in: ["web", "push"] },
      ...(directoryUser ? { OR: [{ userId: null }, { userId: directoryUser.id }] } : { userId: null }),
    },
    orderBy: { createdAt: "desc" },
    take: 12,
  });
  const source = stored.length > 0 ? stored : FALLBACK_NOTIFICATIONS;

  return NextResponse.json({
    notifications: source.map((notification) => ({
      id: notification.id,
      type: notification.type,
      title: locale === "en" ? notification.titleEn : notification.titleFr,
      body: locale === "en" ? notification.bodyEn : notification.bodyFr,
      url: notification.url,
      createdAt: notification.createdAt,
    })),
  });
}
