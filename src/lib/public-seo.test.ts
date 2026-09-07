import { describe, expect, it } from "vitest";
import {
  DEFAULT_PUBLIC_SITE_URL,
  publicImageUrls,
  publicLanguageAlternates,
  publicSearchViewBlockedByRobots,
  publicSiteUrl,
  publicStorefrontPathFromSearchParams,
  publicStaticSitemapEntries,
  ROBOTS_PRIVATE_DISALLOW,
  storefrontMetadataFromSearchParams,
} from "./public-seo";

describe("public SEO", () => {
  it("normalizes the production site URL", () => {
    expect(publicSiteUrl("https://je-mange-africain.com/")).toBe(DEFAULT_PUBLIC_SITE_URL);
    expect(publicSiteUrl("")).toBe(DEFAULT_PUBLIC_SITE_URL);
  });

  it("keeps private and transactional views out of robots crawl paths", () => {
    expect(ROBOTS_PRIVATE_DISALLOW).toEqual(expect.arrayContaining([
      "/admin",
      "/api/",
      "/auth/reset",
      "/*?view=account",
      "/*?view=cart",
      "/*?view=checkout",
      "/*?view=orders",
      "/*?view=info&infoPage=contact",
    ]));
    expect(publicSearchViewBlockedByRobots("checkout")).toBe(true);
    expect(publicSearchViewBlockedByRobots("info", { infoPage: "contact" })).toBe(true);
    expect(publicSearchViewBlockedByRobots("info", { infoPage: "privacy" })).toBe(false);
  });

  it("builds a public sitemap without auth, admin, checkout or support form URLs", () => {
    const entries = publicStaticSitemapEntries(DEFAULT_PUBLIC_SITE_URL, "2026-09-07T00:00:00.000Z");
    const urls = entries.map((entry) => entry.url);

    expect(urls).toEqual(expect.arrayContaining([
      "https://je-mange-africain.com/",
      "https://je-mange-africain.com/?view=catalog",
      "https://je-mange-africain.com/?view=recipes",
      "https://je-mange-africain.com/?view=wholesale",
      "https://je-mange-africain.com/?view=info&infoPage=about",
      "https://je-mange-africain.com/?view=info&infoPage=privacy",
      "https://je-mange-africain.com/?view=info&infoPage=cookies",
      "https://je-mange-africain.com/conditions-generales",
      "https://je-mange-africain.com/confidentialite",
    ]));
    expect(urls.join("\n")).not.toMatch(/admin|auth|checkout|orders|infoPage=contact/);
  });

  it("adds localized alternates and real image URLs for rich discovery", () => {
    expect(publicLanguageAlternates("/?view=recipes", DEFAULT_PUBLIC_SITE_URL)).toEqual({
      languages: {
        "fr-FR": "https://je-mange-africain.com/?view=recipes&lang=fr",
        "en-GB": "https://je-mange-africain.com/?view=recipes&lang=en",
        "x-default": "https://je-mange-africain.com/?view=recipes",
      },
    });
    expect(publicImageUrls(DEFAULT_PUBLIC_SITE_URL, "/products/attieke.webp", "[\"/products/gombo.webp\",\"https://cdn.example.test/fonio.webp\"]")).toEqual([
      "https://je-mange-africain.com/products/attieke.webp",
      "https://je-mange-africain.com/products/gombo.webp",
      "https://cdn.example.test/fonio.webp",
    ]);
  });

  it("canonicalizes public storefront query views", () => {
    expect(publicStorefrontPathFromSearchParams({ view: "catalog", query: "attieke" })).toBe("/?view=catalog");
    expect(publicStorefrontPathFromSearchParams({ view: "product", productId: "attieke-premium" })).toBe("/?view=product&productId=attieke-premium");
    expect(publicStorefrontPathFromSearchParams({ view: "recipe-config", recipeId: "mafe-poulet" })).toBe("/?view=recipe-config&recipeId=mafe-poulet");
    expect(publicStorefrontPathFromSearchParams({ view: "info", infoPage: "privacy" })).toBe("/?view=info&infoPage=privacy");
    expect(publicStorefrontPathFromSearchParams({ view: "unknown" })).toBe("/");
  });

  it("adds noindex metadata to private and transactional storefront views", () => {
    expect(storefrontMetadataFromSearchParams({ view: "checkout" }, DEFAULT_PUBLIC_SITE_URL)).toMatchObject({
      alternates: { canonical: "https://je-mange-africain.com/" },
      robots: { index: false, follow: false },
    });
    expect(storefrontMetadataFromSearchParams({ view: "orders" }, DEFAULT_PUBLIC_SITE_URL)).toMatchObject({
      robots: { index: false, follow: false },
    });
    expect(storefrontMetadataFromSearchParams({ view: "info", infoPage: "contact" }, DEFAULT_PUBLIC_SITE_URL)).toMatchObject({
      alternates: { canonical: "https://je-mange-africain.com/" },
      robots: { index: false, follow: false },
    });
  });

  it("keeps public storefront metadata indexable", () => {
    expect(storefrontMetadataFromSearchParams({ view: "recipes" }, DEFAULT_PUBLIC_SITE_URL)).toMatchObject({
      alternates: { canonical: "https://je-mange-africain.com/?view=recipes" },
      robots: { index: true, follow: true },
    });
    expect(storefrontMetadataFromSearchParams({ view: "info", infoPage: "delivery" }, DEFAULT_PUBLIC_SITE_URL)).toMatchObject({
      alternates: { canonical: "https://je-mange-africain.com/?view=info&infoPage=delivery" },
      robots: { index: true, follow: true },
    });
  });
});
