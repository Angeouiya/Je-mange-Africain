"use client";

import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

export function SectionHeading({ eyebrow, title, subtitle, action, className }: SectionHeadingProps) {
  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-5", className)}>
      <div>
        {eyebrow && (
          <div className="text-xs uppercase tracking-[0.18em] font-bold text-terre mb-1">
            {eyebrow}
          </div>
        )}
        <h2 className="text-2xl sm:text-3xl font-extrabold text-charcoal leading-tight">{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
