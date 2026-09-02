"use client";

import { Globe } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Locale } from "@/lib/i18n";

export function LanguageSwitch({ compact = false }: { compact?: boolean }) {
  const locale = useStore((s) => s.locale);
  const setLocale = useStore((s) => s.setLocale);

  const toggle = () => setLocale(locale === "fr" ? "en" : "fr");

  if (compact) {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-label={locale === "fr" ? "Passer la plateforme en anglais" : "Switch the platform to French"}
        className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-charcoal transition hover:bg-muted"
      >
        <Globe className="h-3.5 w-3.5" />
        {locale.toUpperCase()}
      </button>
    );
  }

  return (
    <div className="inline-flex items-center rounded-full border border-border bg-card p-0.5">
      <Globe className="ml-2 mr-1 h-3.5 w-3.5 text-muted-foreground" />
      {(["fr", "en"] as Locale[]).map((l) => (
        <button
          type="button"
          key={l}
          onClick={() => setLocale(l)}
          aria-label={l === "fr" ? "Afficher la plateforme en français" : "Display the platform in English"}
          aria-pressed={locale === l}
          className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
            locale === l ? "bg-terre text-cream" : "text-charcoal hover:bg-muted"
          }`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
