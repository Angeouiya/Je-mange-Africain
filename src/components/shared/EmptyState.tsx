"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  emoji?: string;
  title: string;
  description?: string;
  ctaLabel?: string;
  onCta?: () => void;
  className?: string;
}

export function EmptyState({ emoji, title, description, ctaLabel, onCta, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-16 px-4 rounded-2xl bg-cream/40 border border-dashed border-border",
        className
      )}
    >
      {emoji && <div className="text-6xl mb-3 select-none" aria-hidden>{emoji}</div>}
      <h3 className="text-lg font-bold text-charcoal">{title}</h3>
      {description && <p className="text-sm text-muted-foreground mt-1 max-w-md">{description}</p>}
      {ctaLabel && onCta && (
        <Button onClick={onCta} className="mt-5 bg-terre hover:bg-terre-dark text-cream">
          {ctaLabel}
        </Button>
      )}
    </div>
  );
}
