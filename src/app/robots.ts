import type { MetadataRoute } from "next";
import { publicSiteUrl, ROBOTS_PRIVATE_DISALLOW } from "@/lib/public-seo";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = publicSiteUrl();
  return {
    rules: { userAgent: "*", allow: "/", disallow: [...ROBOTS_PRIVATE_DISALLOW] },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
