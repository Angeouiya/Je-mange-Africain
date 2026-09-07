"use client";

import type { ReactNode } from "react";
import type { IconFunction } from "reicon/createIcon";
import { cn } from "@/lib/utils";
import { ReiconGlyph } from "@/components/ui/reicon-glyph";

export type StorefrontWorkspaceSignal = {
  label: string;
  value: string;
  icon: IconFunction;
  tone?: "burgundy" | "earth" | "gold";
};

type StorefrontWorkspaceHeaderProps = {
  icon: IconFunction;
  eyebrow: string;
  title: string;
  description: string;
  signals?: StorefrontWorkspaceSignal[];
  signalsMobile?: boolean;
  action?: ReactNode;
  switcher?: ReactNode;
  variant?: "band" | "hero";
  className?: string;
};

const signalToneClasses: Record<NonNullable<StorefrontWorkspaceSignal["tone"]>, string> = {
  burgundy: "border-burgundy/16 bg-burgundy/[0.045] text-burgundy",
  earth: "border-terre/18 bg-terre/[0.055] text-terre",
  gold: "border-gold/35 bg-gold/[0.12] text-charcoal",
};

export function StorefrontWorkspaceHeader({ icon, eyebrow, title, description, signals = [], signalsMobile = true, action, switcher, variant = "band", className }: StorefrontWorkspaceHeaderProps) {
  const band = variant === "band";

  return (
    <section
      data-testid="storefront-workspace-header"
      className={cn(
        "min-w-0",
        band && "overflow-hidden rounded-md border border-burgundy/10 bg-[linear-gradient(116deg,rgba(255,255,255,1),rgba(255,249,242,0.92),rgba(242,169,0,0.065))] shadow-[0_18px_44px_-38px_rgba(90,38,50,0.72)]",
        className,
      )}
    >
      <div className={cn("min-w-0", band && "p-3.5 sm:p-4")}>
        <div className="flex min-w-0 items-start gap-3">
          <span className={cn("grid shrink-0 place-items-center rounded-md border border-terre/15 bg-white/86 text-terre shadow-[0_12px_28px_-24px_rgba(185,71,43,0.78)]", variant === "hero" ? "h-10 w-10 sm:h-11 sm:w-11" : "h-11 w-11")}>
            <ReiconGlyph icon={icon} weight="Filled" className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase text-terre">{eyebrow}</p>
            <h1 className={cn("mt-1 font-display font-semibold leading-tight text-charcoal", variant === "hero" ? "max-w-xl text-[1.45rem] sm:text-2xl md:text-4xl" : "text-[1.6rem] sm:text-3xl")}>{title}</h1>
            <p className={cn("mt-1.5 max-w-2xl text-[11px] leading-4 text-charcoal/72 sm:text-sm sm:leading-5", variant === "hero" && "line-clamp-1 sm:line-clamp-2")}>{description}</p>
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>

        {signals.length || switcher ? (
          <div className={cn("mt-3 grid min-w-0 gap-2", switcher ? "sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end" : "")}>
            {signals.length ? (
              <div
                className={cn("-mx-1 min-w-0 gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", signalsMobile ? "flex" : "hidden sm:flex")}
                role="region"
                tabIndex={0}
                aria-label={title}
              >
                {signals.map((signal) => (
                  <span
                    key={`${signal.label}-${signal.value}`}
                    data-testid="storefront-workspace-signal"
                    className={cn(
                      "inline-flex min-h-11 min-w-[7.5rem] shrink-0 items-center gap-2 rounded-md border px-2.5 py-1.5",
                      signalToneClasses[signal.tone || "burgundy"],
                    )}
                  >
                    <ReiconGlyph icon={signal.icon} weight="Filled" className="h-4 w-4" />
                    <span className="min-w-0">
                      <span className="block truncate text-[12px] font-black leading-4 tabular-nums">{signal.value}</span>
                      <span className="block truncate text-[8px] font-bold uppercase text-muted-foreground">{signal.label}</span>
                    </span>
                  </span>
                ))}
              </div>
            ) : null}
            {switcher ? <div className="min-w-0">{switcher}</div> : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
