import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://je-mange-africain.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: siteUrl, lastModified, changeFrequency: "daily", priority: 1 },
    { url: `${siteUrl}/conditions-generales`, lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: `${siteUrl}/confidentialite`, lastModified, changeFrequency: "yearly", priority: 0.3 },
  ];
}
