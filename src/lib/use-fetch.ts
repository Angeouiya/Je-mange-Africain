"use client";
import { useEffect, useState, useCallback, useMemo } from "react";

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

type FetchOptions = {
  cache?: boolean;
  ttlMs?: number;
};

const DEFAULT_JSON_CACHE_TTL_MS = 45_000;
const jsonCache = new Map<string, { data?: unknown; promise?: Promise<unknown>; expiresAt: number }>();

export class ApiError<T = Record<string, unknown>> extends Error {
  constructor(message: string, public readonly status: number, public readonly payload: T) {
    super(message);
    this.name = "ApiError";
  }
}

function normalizedHeaders(headers: Record<string, string>) {
  return Object.fromEntries(Object.entries(headers).sort(([left], [right]) => left.localeCompare(right)));
}

function jsonCacheKey(url: string, headers: Record<string, string>) {
  return `${url}::${JSON.stringify(normalizedHeaders(headers))}`;
}

function readCachedJSON<T>(key: string): T | null {
  const cached = jsonCache.get(key);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now() && !cached.promise) {
    jsonCache.delete(key);
    return null;
  }
  return Object.hasOwn(cached, "data") ? cached.data as T : null;
}

async function getJSON<T>(url: string, headers: Record<string, string>) {
  const response = await fetch(url, { headers: { Accept: "application/json", ...headers } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return await response.json() as T;
}

export function prefetchJSON<T = unknown>(url: string | null, headers: Record<string, string> = {}, options: FetchOptions = {}): Promise<T | null> {
  if (!url) return Promise.resolve(null);
  const ttlMs = options.ttlMs ?? DEFAULT_JSON_CACHE_TTL_MS;
  const key = jsonCacheKey(url, headers);
  const cached = jsonCache.get(key);
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    if (Object.hasOwn(cached, "data")) return Promise.resolve(cached.data as T);
    if (cached.promise) return cached.promise as Promise<T>;
  }
  const promise = getJSON<T>(url, headers)
    .then((data) => {
      jsonCache.set(key, { data, expiresAt: Date.now() + ttlMs });
      return data;
    })
    .catch((error) => {
      jsonCache.delete(key);
      throw error;
    });
  jsonCache.set(key, { promise, expiresAt: now + ttlMs });
  return promise;
}

export function clearFetchCache(url?: string, headers: Record<string, string> = {}) {
  if (!url) {
    jsonCache.clear();
    return;
  }
  jsonCache.delete(jsonCacheKey(url, headers));
}

/** Simple GET fetcher with locale-aware query + abort. */
export function useFetch<T = any>(
  url: string | null,
  deps: any[] = [],
  headers: Record<string, string> = {},
  options: FetchOptions = {}
): FetchState<T> {
  const cacheEnabled = Boolean(options.cache);
  const ttlMs = options.ttlMs ?? DEFAULT_JSON_CACHE_TTL_MS;
  const headerKey = JSON.stringify(normalizedHeaders(headers));
  const stableHeaders = useMemo(() => normalizedHeaders(headers), [headerKey]);
  const cacheKey = url && cacheEnabled ? jsonCacheKey(url, stableHeaders) : "";
  const initialCache = cacheKey ? readCachedJSON<T>(cacheKey) : null;
  const [data, setData] = useState<T | null>(initialCache);
  const [loading, setLoading] = useState(Boolean(url && !initialCache));
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => {
    if (cacheKey) jsonCache.delete(cacheKey);
    setTick((t) => t + 1);
  }, [cacheKey]);

  useEffect(() => {
    if (!url) {
      setData(null);
      setLoading(false);
      return;
    }
    let aborted = false;
    const cached = cacheKey ? readCachedJSON<T>(cacheKey) : null;
    if (cached) {
      setData(cached);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    (cacheKey ? prefetchJSON<T>(url, stableHeaders, { ttlMs }) : getJSON<T>(url, stableHeaders))
      .then((j) => {
        if (!aborted) {
          setData(j);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!aborted) {
          setError(e.message || "Erreur");
          setLoading(false);
        }
      });
    return () => {
      aborted = true;
    };
  }, [url, tick, cacheKey, ttlMs, stableHeaders, ...deps]);

  return { data, loading, error, refetch };
}

/** POST helper. */
export async function postJSON<T = any>(url: string, body: any): Promise<T> {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const j = await r.json();
  if (!r.ok) throw new ApiError(j.error || `HTTP ${r.status}`, r.status, j);
  return j;
}
