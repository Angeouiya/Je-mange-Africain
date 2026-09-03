"use client";

import { useEffect } from "react";
import type { Locale } from "@/lib/i18n";
import { useStore } from "@/lib/store";

export function DocumentLocaleSync({ locale }: { locale: Locale }) {
  useEffect(() => {
    useStore.getState().setLocale(locale);
  }, [locale]);

  return null;
}
