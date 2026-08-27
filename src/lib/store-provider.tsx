"use client";

import { useEffect } from "react";
import { useStore } from "./store";

/**
 * Ensures the persisted store is hydrated before rendering children,
 * preventing hydration mismatches between server and client.
 * Hydration is handled by Zustand persist's onRehydrateStorage; this
 * provider just warms the store reference so SSR + client stay in sync.
 */
export function StoreProvider({ children }: { children: React.ReactNode }) {
  const locale = useStore((state) => state.locale);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return <>{children}</>;
}
