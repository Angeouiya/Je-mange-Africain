import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://je-mange-africain.com").replace(/\/$/, "");

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();
  const staticEntries: MetadataRoute.Sitemap = [
    { url: siteUrl, lastModified, changeFrequency: "daily", priority: 1 },
    { url: `${siteUrl}/?view=catalog`, lastModified, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/?view=recipes`, lastModified, changeFrequency: "weekly", priority: 0.85 },
    { url: `${siteUrl}/?view=wholesale`, lastModified, changeFrequency: "daily", priority: 0.8 },
    { url: `${siteUrl}/?view=info&infoPage=help`, lastModified, changeFrequency: "monthly", priority: 0.45 },
    { url: `${siteUrl}/?view=info&infoPage=delivery`, lastModified, changeFrequency: "monthly", priority: 0.45 },
    { url: `${siteUrl}/?view=info&infoPage=contact`, lastModified, changeFrequency: "monthly", priority: 0.4 },
    { url: `${siteUrl}/conditions-generales`, lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: `${siteUrl}/confidentialite`, lastModified, changeFrequency: "yearly", priority: 0.3 },
  ];

  try {
    const [products, recipes] = await Promise.all([
      db.product.findMany({ where: { status: "published" }, select: { id: true, updatedAt: true } }),
      db.recipe.findMany({ where: { status: "published" }, select: { id: true, updatedAt: true } }),
    ]);

    return [
      ...staticEntries,
      ...products.map((product) => ({
        url: `${siteUrl}/?view=product&productId=${encodeURIComponent(product.id)}`,
        lastModified: product.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.75,
      })),
      ...recipes.map((recipe) => ({
        url: `${siteUrl}/?view=recipe-config&recipeId=${encodeURIComponent(recipe.id)}`,
        lastModified: recipe.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
    ];
  } catch {
    return staticEntries;
  }
}
