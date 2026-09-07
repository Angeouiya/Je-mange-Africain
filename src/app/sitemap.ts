import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { absolutePublicUrl, publicImageUrls, publicLanguageAlternates, publicSiteUrl, publicStaticSitemapEntries } from "@/lib/public-seo";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = publicSiteUrl();
  const lastModified = new Date();
  const staticEntries = publicStaticSitemapEntries(siteUrl, lastModified);

  try {
    const [products, recipes] = await Promise.all([
      db.product.findMany({ where: { status: "published" }, select: { id: true, updatedAt: true, imageUrl: true, galleryUrls: true } }),
      db.recipe.findMany({ where: { status: "published" }, select: { id: true, updatedAt: true, imageUrl: true, galleryUrls: true } }),
    ]);

    return [
      ...staticEntries,
      ...products.map((product): MetadataRoute.Sitemap[number] => ({
        url: absolutePublicUrl(`/?view=product&productId=${encodeURIComponent(product.id)}`, siteUrl),
        lastModified: product.updatedAt,
        changeFrequency: "weekly",
        priority: 0.75,
        images: publicImageUrls(siteUrl, product.imageUrl, product.galleryUrls),
        alternates: publicLanguageAlternates(`/?view=product&productId=${encodeURIComponent(product.id)}`, siteUrl),
      })),
      ...recipes.map((recipe): MetadataRoute.Sitemap[number] => ({
        url: absolutePublicUrl(`/?view=recipe-config&recipeId=${encodeURIComponent(recipe.id)}`, siteUrl),
        lastModified: recipe.updatedAt,
        changeFrequency: "weekly",
        priority: 0.7,
        images: publicImageUrls(siteUrl, recipe.imageUrl, recipe.galleryUrls),
        alternates: publicLanguageAlternates(`/?view=recipe-config&recipeId=${encodeURIComponent(recipe.id)}`, siteUrl),
      })),
    ];
  } catch {
    return staticEntries;
  }
}
