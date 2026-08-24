"use client";

import { Minus, Plus } from "lucide-react";

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
  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(Math.min(max, value + 1));
  return (
    <div className="inline-flex items-center rounded-full border border-border bg-background">
      <button
        type="button"
        onClick={dec}
        disabled={value <= min}
        aria-label="Diminuer"
        className={`${dim} grid place-items-center rounded-full text-charcoal transition hover:bg-muted disabled:opacity-40`}
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className="min-w-8 text-center text-sm font-semibold tabular-nums">{value}</span>
      <button
        type="button"
        onClick={inc}
        disabled={value >= max}
        aria-label="Augmenter"
        className={`${dim} grid place-items-center rounded-full text-charcoal transition hover:bg-muted disabled:opacity-40`}
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
