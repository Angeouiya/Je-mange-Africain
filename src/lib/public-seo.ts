import type { MetadataRoute } from "next";

export const DEFAULT_PUBLIC_SITE_URL = "https://je-mange-africain.com";

export const ROBOTS_PRIVATE_DISALLOW = [
  "/admin",
  "/admin/",
  "/api/",
  "/auth/",
  "/auth/reset",
  "/*?view=account",
  "/*?view=cart",
  "/*?view=checkout",
  "/*?view=order-confirmation",
  "/*?view=order-tracking",
  "/*?view=orders",
  "/*?view=info&infoPage=contact",
] as const;

type ChangeFrequency = NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;

type PublicSitemapRoute = {
  path: string;
  changeFrequency: ChangeFrequency;
  priority: number;
};

export const PUBLIC_SITEMAP_ROUTES: PublicSitemapRoute[] = [
  { path: "/", changeFrequency: "daily", priority: 1 },
  { path: "/?view=catalog", changeFrequency: "daily", priority: 0.9 },
  { path: "/?view=recipes", changeFrequency: "weekly", priority: 0.85 },
  { path: "/?view=wholesale", changeFrequency: "daily", priority: 0.8 },
  { path: "/?view=info&infoPage=about", changeFrequency: "monthly", priority: 0.5 },
  { path: "/?view=info&infoPage=help", changeFrequency: "monthly", priority: 0.45 },
  { path: "/?view=info&infoPage=delivery", changeFrequency: "monthly", priority: 0.45 },
  { path: "/?view=info&infoPage=privacy", changeFrequency: "yearly", priority: 0.35 },
  { path: "/?view=info&infoPage=cookies", changeFrequency: "yearly", priority: 0.35 },
  { path: "/?view=info&infoPage=cgv", changeFrequency: "yearly", priority: 0.35 },
  { path: "/conditions-generales", changeFrequency: "yearly", priority: 0.3 },
  { path: "/confidentialite", changeFrequency: "yearly", priority: 0.3 },
];

export function publicSiteUrl(value: string | undefined = process.env.NEXT_PUBLIC_SITE_URL) {
  return (value || DEFAULT_PUBLIC_SITE_URL).replace(/\/+$/, "") || DEFAULT_PUBLIC_SITE_URL;
}

export function absolutePublicUrl(path: string, siteUrl = publicSiteUrl()) {
  return new URL(path || "/", siteUrl).toString();
}

function withLanguage(path: string, language: "fr" | "en", siteUrl: string) {
  const url = new URL(path || "/", siteUrl);
  if (language === "fr") url.searchParams.set("lang", "fr");
  if (language === "en") url.searchParams.set("lang", "en");
  return url.toString();
}

export function publicLanguageAlternates(path: string, siteUrl = publicSiteUrl()) {
  const canonical = absolutePublicUrl(path, siteUrl);
  return {
    languages: {
      "fr-FR": withLanguage(path, "fr", siteUrl),
      "en-GB": withLanguage(path, "en", siteUrl),
      "x-default": canonical,
    },
  };
}

export function publicStaticSitemapEntries(siteUrl = publicSiteUrl(), lastModified: Date | string = new Date()): MetadataRoute.Sitemap {
  return PUBLIC_SITEMAP_ROUTES.map((route) => ({
    url: absolutePublicUrl(route.path, siteUrl),
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
    alternates: publicLanguageAlternates(route.path, siteUrl),
  }));
}

function galleryUrls(value: string | null | undefined) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string" && Boolean(item.trim())) : [];
  } catch {
    return [];
  }
}

export function publicImageUrls(siteUrl: string, ...values: Array<string | null | undefined>) {
  const urls = values.flatMap((value) => {
    const trimmed = value?.trim();
    if (!trimmed) return [];
    return trimmed.startsWith("[") ? galleryUrls(trimmed) : [trimmed];
  });
  return [...new Set(urls.map((value) => {
    try {
      return new URL(value, siteUrl).toString();
    } catch {
      return "";
    }
  }).filter(Boolean))];
}

export function publicSearchViewBlockedByRobots(view: string, params: Record<string, string | undefined> = {}) {
  if (["account", "cart", "checkout", "order-confirmation", "order-tracking", "orders"].includes(view)) return true;
  return view === "info" && params.infoPage === "contact";
}
