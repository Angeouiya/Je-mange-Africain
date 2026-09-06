"use client";

import { Star } from "reicon/icons/Star";
import { ReiconGlyph } from "@/components/ui/reicon-glyph";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating: number; // 0..5
  size?: number;
  showValue?: boolean;
  className?: string;
}

export function StarRating({ rating, size = 14, showValue = false, className }: StarRatingProps) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <div className={cn("inline-flex items-center gap-0.5", className)} aria-label={`${rating.toFixed(1)} / 5`}>
      {[0, 1, 2, 3, 4].map((i) => {
        const filled = i < full || (i === full && half);
        return (
          <ReiconGlyph
            key={i}
            icon={Star}
            size={size}
            weight={filled ? "Filled" : "Outline"}
            className={filled ? "text-gold fill-[var(--gold)]" : "text-muted-foreground/40"}
          />
        );
      })}
      {showValue && (
        <span className="ml-1 text-xs text-muted-foreground">{rating.toFixed(1)}</span>
      )}
    </div>
  );
}
