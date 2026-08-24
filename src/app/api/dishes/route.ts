import { NextRequest, NextResponse } from "next/server";
import { localizeDish, searchDishLibrary } from "@/lib/dish-library";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const searchParams = new URL(request.url).searchParams;
  const locale = searchParams.get("locale") === "en" ? "en" : "fr";
  const query = searchParams.get("q") || "";
  const product = searchParams.get("product") || "";
  const country = searchParams.get("country") || "";
  const category = searchParams.get("category") || "";
  const limit = Number(searchParams.get("limit") || 60);
  const matches = searchDishLibrary({ query, product, country, category, limit });

  return NextResponse.json({
    dishes: matches.map(({ dish, score }) => localizeDish(dish, locale, score)),
    total: matches.length,
    countries: ["Côte d'Ivoire", "Sénégal", "Cameroun", "Nigeria", "Ghana", "Éthiopie", "Congo"],
    categories: [
      { slug: "main", name: locale === "fr" ? "Plats complets" : "Main dishes" },
      { slug: "sauce", name: locale === "fr" ? "Sauces et mijotés" : "Sauces and stews" },
      { slug: "grill", name: locale === "fr" ? "Braisés" : "Grilled dishes" },
      { slug: "street-food", name: locale === "fr" ? "Cuisine de rue" : "Street food" },
    ],
  });
}
