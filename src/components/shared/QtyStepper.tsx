"use client";

import { Minus } from "reicon/icons/Minus";
import { Plus } from "reicon/icons/Plus";
import { ReiconGlyph } from "@/components/ui/reicon-glyph";

export function QtyStepper({
  value,
  onChange,
  min = 1,
  max = 99,
  size = "md",
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  size?: "sm" | "md";
}) {
  const dim = size === "sm" ? "h-7 w-7" : "h-9 w-9";
  const valueWidth = size === "sm" ? "min-w-7" : "min-w-9";
  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(Math.min(max, value + 1));
  return (
    <div className="inline-flex items-center rounded-md border border-burgundy/10 bg-white shadow-[0_10px_24px_-22px_rgba(90,38,50,0.58)]">
      <button
        type="button"
        onClick={dec}
        disabled={value <= min}
        aria-label="Diminuer"
        className={`${dim} grid place-items-center rounded-md text-burgundy transition hover:bg-burgundy/[0.06] disabled:text-muted-foreground disabled:opacity-45`}
      >
        <ReiconGlyph icon={Minus} className="h-3.5 w-3.5" />
      </button>
      <span className={`${valueWidth} border-x border-burgundy/8 text-center text-sm font-black tabular-nums text-charcoal`}>{value}</span>
      <button
        type="button"
        onClick={inc}
        disabled={value >= max}
        aria-label="Augmenter"
        className={`${dim} grid place-items-center rounded-md text-burgundy transition hover:bg-burgundy/[0.06] disabled:text-muted-foreground disabled:opacity-45`}
      >
        <ReiconGlyph icon={Plus} className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
