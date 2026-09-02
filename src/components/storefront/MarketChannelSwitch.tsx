"use client";

import { Boxes, Store } from "lucide-react";
import { useStore } from "@/lib/store";

export function MarketChannelSwitch({ channel }: { channel: "retail" | "wholesale" }) {
  const locale = useStore((state) => state.locale);
  const navigate = useStore((state) => state.navigate);
  const options = [
    { id: "retail" as const, label: locale === "fr" ? "Au détail" : "Retail", icon: Store, view: "catalog" as const },
    { id: "wholesale" as const, label: locale === "fr" ? "Marché de gros" : "Wholesale", icon: Boxes, view: "wholesale" as const },
  ];

  return (
    <div className="grid w-full grid-cols-2 rounded-md bg-muted p-1 sm:w-fit" role="group" aria-label={locale === "fr" ? "Type de marché" : "Market type"}>
      {options.map((option) => {
        const Icon = option.icon;
        const active = option.id === channel;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => navigate(option.view)}
            aria-pressed={active}
            className={`flex min-h-9 items-center justify-center gap-2 rounded-md px-3 text-[11px] font-extrabold transition ${active ? "bg-white text-charcoal shadow-sm" : "text-muted-foreground hover:text-charcoal"}`}
          >
            <Icon className="h-4 w-4" />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
