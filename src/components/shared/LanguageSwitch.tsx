"use client";

import { Globe } from "reicon/icons/Globe";
import { ReiconGlyph } from "@/components/ui/reicon-glyph";
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
        className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-burgundy/10 bg-white px-2.5 text-xs font-black text-charcoal shadow-[0_10px_24px_-22px_rgba(90,38,50,0.6)] transition hover:border-terre/20 hover:bg-cream/70 hover:text-terre"
      >
        <ReiconGlyph icon={Globe} className="h-3.5 w-3.5 text-burgundy" />
        {locale.toUpperCase()}
      </button>
    );
  }

  return (
    <div className="inline-flex items-center rounded-md border border-burgundy/10 bg-white p-0.5 shadow-[0_10px_24px_-22px_rgba(90,38,50,0.6)]">
      <ReiconGlyph icon={Globe} className="ml-2 mr-1 h-3.5 w-3.5 text-burgundy" />
      {(["fr", "en"] as Locale[]).map((l) => (
        <button
          type="button"
          key={l}
          onClick={() => setLocale(l)}
          aria-label={l === "fr" ? "Afficher la plateforme en français" : "Display the platform in English"}
          aria-pressed={locale === l}
          className={`min-h-8 rounded-md px-2.5 text-xs font-black transition ${
            locale === l ? "bg-burgundy text-white shadow-sm" : "text-charcoal hover:bg-cream/80"
          }`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
