import { NextResponse } from "next/server";

const PUBLIC_API_CACHE_PRESETS = {
  storefrontHome: { browser: 20, edge: 90, stale: 180 },
  storefrontList: { browser: 15, edge: 60, stale: 120 },
  storefrontDetail: { browser: 10, edge: 30, stale: 60 },
  storefrontReference: { browser: 120, edge: 600, stale: 1200 },
  dishLibrary: { browser: 60, edge: 300, stale: 600 },
} as const;

export type PublicApiCachePreset = keyof typeof PUBLIC_API_CACHE_PRESETS;

export function publicApiCacheHeader(preset: PublicApiCachePreset) {
  const timing = PUBLIC_API_CACHE_PRESETS[preset];
  return `public, max-age=${timing.browser}, s-maxage=${timing.edge}, stale-while-revalidate=${timing.stale}`;
}

export function publicApiCdnCacheHeader(preset: PublicApiCachePreset) {
  const timing = PUBLIC_API_CACHE_PRESETS[preset];
  return `public, max-age=${timing.edge}, stale-while-revalidate=${timing.stale}`;
}

export function publicApiCacheHeaders(preset: PublicApiCachePreset) {
  return {
    "Cache-Control": publicApiCacheHeader(preset),
    "CDN-Cache-Control": publicApiCdnCacheHeader(preset),
    "Cloudflare-CDN-Cache-Control": publicApiCdnCacheHeader(preset),
    Vary: "Accept-Language",
  };
}

export function jsonWithPublicApiCache<T>(payload: T, preset: PublicApiCachePreset, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  const cacheHeaders = publicApiCacheHeaders(preset);
  for (const [key, value] of Object.entries(cacheHeaders)) {
    headers.set(key, value);
  }
  return NextResponse.json(payload, { ...init, headers });
}
