"use client";
import { useEffect, useState, useCallback } from "react";

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/** Simple GET fetcher with locale-aware query + abort. */
export function useFetch<T = any>(
  url: string | null,
  deps: any[] = [],
  headers: Record<string, string> = {}
): FetchState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!!url);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const headerKey = JSON.stringify(headers);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!url) {
      setData(null);
      setLoading(false);
      return;
    }
    let aborted = false;
    setLoading(true);
    setError(null);
    fetch(url, { headers: { Accept: "application/json", ...headers } })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
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
  }, [url, tick, headerKey, ...deps]);

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
  if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
  return j;
}
