import { describe, expect, it } from "vitest";
import { publicApiCacheHeader, publicApiCdnCacheHeader, publicApiCacheHeaders } from "./public-api-cache";

describe("public API cache headers", () => {
  it("keeps storefront detail data fresh enough for prices and stock", () => {
    expect(publicApiCacheHeader("storefrontDetail")).toBe("public, max-age=10, s-maxage=30, stale-while-revalidate=60");
    expect(publicApiCdnCacheHeader("storefrontDetail")).toBe("public, max-age=30, stale-while-revalidate=60");
  });

  it("adds Cloudflare-compatible headers for public references", () => {
    expect(publicApiCacheHeaders("storefrontReference")).toMatchObject({
      "Cache-Control": "public, max-age=120, s-maxage=600, stale-while-revalidate=1200",
      "CDN-Cache-Control": "public, max-age=600, stale-while-revalidate=1200",
      "Cloudflare-CDN-Cache-Control": "public, max-age=600, stale-while-revalidate=1200",
      Vary: "Accept-Language",
    });
  });
});
