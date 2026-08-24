"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating: number; // 0..5
  size?: number;
  showValue?: boolean;
  className?: string;
}

/** Static star rating (visual only). */
export function StarRating({ rating, size = 14, showValue = false, className }: StarRatingProps) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <div className={cn("inline-flex items-center gap-0.5", className)} aria-label={`${rating.toFixed(1)} / 5`}>
      {[0, 1, 2, 3, 4].map((i) => {
        const filled = i < full || (i === full && half);
        return (
          <Star
            key={i}
            size={size}
            className={filled ? "text-gold fill-[var(--gold)]" : "text-muted-foreground/40"}
            strokeWidth={1.5}
          />
        );
      })}
      {showValue && (
        <span className="ml-1 text-xs text-muted-foreground">{rating.toFixed(1)}</span>
      )}
    </div>
  );
}
