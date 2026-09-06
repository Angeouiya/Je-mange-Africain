"use client";

import type { IconFunction } from "reicon/createIcon";
import { Box } from "reicon/icons/Box";
import { Store } from "reicon/icons/Store";
import { ReiconGlyph } from "@/components/ui/reicon-glyph";
import { useStore } from "@/lib/store";

export function MarketChannelSwitch({ channel }: { channel: "retail" | "wholesale" }) {
  const locale = useStore((state) => state.locale);
  const navigate = useStore((state) => state.navigate);
  const options: Array<{ id: "retail" | "wholesale"; label: string; detail: string; icon: IconFunction; view: "catalog" | "wholesale" }> = [
    { id: "retail", label: locale === "fr" ? "Au détail" : "Retail", detail: locale === "fr" ? "Unités" : "Units", icon: Store, view: "catalog" },
    { id: "wholesale", label: locale === "fr" ? "Marché de gros" : "Wholesale", detail: locale === "fr" ? "Lots" : "Cases", icon: Box, view: "wholesale" },
  ];

  return (
    <div className="grid w-full grid-cols-2 gap-1 rounded-lg border border-burgundy/10 bg-white p-1 shadow-[0_16px_34px_-30px_rgba(90,38,50,0.72)] sm:w-fit" role="group" aria-label={locale === "fr" ? "Type de marché" : "Market type"}>
      {options.map((option) => {
        const active = option.id === channel;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => navigate(option.view)}
            aria-pressed={active}
            className={`relative flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-md px-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terre/35 ${active ? "bg-[linear-gradient(145deg,rgba(185,71,43,0.12),rgba(242,169,0,0.08))] text-charcoal shadow-[0_10px_24px_-20px_rgba(90,38,50,0.72)]" : "text-muted-foreground hover:bg-cream/75 hover:text-charcoal"}`}
          >
            <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-md ${active ? "bg-burgundy text-white" : "bg-burgundy/7 text-burgundy"}`}>
              <ReiconGlyph icon={option.icon} weight={active ? "Filled" : "Outline"} className="h-3.5 w-3.5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[11px] font-black leading-4">{option.label}</span>
              <span className="block truncate text-[8px] font-bold uppercase text-muted-foreground">{option.detail}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
