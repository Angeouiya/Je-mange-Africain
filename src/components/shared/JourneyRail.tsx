"use client";

import type { ComponentType } from "react";
import type { IconFunction, IconWeight } from "reicon/createIcon";
import { AlertTriangle } from "reicon/icons/AlertTriangle";
import { Check } from "reicon/icons/Check";
import { ReiconGlyph } from "@/components/ui/reicon-glyph";
import { cn } from "@/lib/utils";

type JourneyIcon = IconFunction | ComponentType<{ className?: string }>;

export type JourneyStage = {
  id: string;
  label: string;
  detail?: string;
  icon: JourneyIcon;
};

function isReiconIcon(icon: JourneyIcon): icon is IconFunction {
  return typeof (icon as IconFunction).toSvg === "function";
}

function JourneyIconGlyph({ icon, className, weight = "Outline" }: { icon: JourneyIcon; className?: string; weight?: IconWeight }) {
  if (isReiconIcon(icon)) return <ReiconGlyph icon={icon} weight={weight} className={className} />;
  const Icon = icon;
  return <Icon className={className} />;
}

export function JourneyRail({
  stages,
  activeIndex,
  progress,
  label,
  progressLabel,
  interrupted = false,
  showDetails = false,
  surface = "framed",
  onStageSelect,
  testId,
  className,
}: {
  stages: JourneyStage[];
  activeIndex: number;
  progress: number;
  label: string;
  progressLabel: string;
  interrupted?: boolean;
  showDetails?: boolean;
  surface?: "framed" | "flush";
  onStageSelect?: (index: number) => void;
  testId?: string;
  className?: string;
}) {
  const currentIndex = interrupted ? 0 : activeIndex;

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-white",
        surface === "framed" && "rounded-lg border border-burgundy/12 px-2 py-2.5 sm:px-3",
        className,
      )}
      aria-label={label}
      data-testid={testId}
    >
      <span className="sr-only" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.max(0, Math.min(100, Math.round(progress)))} aria-label={progressLabel} />
      <ol aria-label={label} className="grid" style={{ gridTemplateColumns: `repeat(${stages.length}, minmax(0, 1fr))` }}>
        {stages.map((stage, index) => {
          const complete = !interrupted && index < currentIndex;
          const current = index === currentIndex;
          const selectable = Boolean(onStageSelect && !interrupted && index <= activeIndex);
          const icon = interrupted && current ? AlertTriangle : complete ? Check : stage.icon;
          const iconWeight: IconWeight = (interrupted && current) || complete || current ? "Filled" : "Outline";
          const content = (
            <>
              <span className={cn(
                "relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-md border transition duration-200",
                complete && "border-burgundy bg-burgundy text-white shadow-[0_10px_22px_-18px_rgba(138,48,66,0.9)]",
                current && !interrupted && "border-terre/35 bg-[linear-gradient(145deg,#FFF6EF,#FFE9DD)] text-terre shadow-[0_10px_24px_-18px_rgba(185,71,43,0.9)]",
                current && interrupted && "border-destructive/30 bg-destructive/[0.07] text-destructive shadow-[0_10px_24px_-20px_rgba(201,42,62,0.85)]",
                !complete && !current && "border-charcoal/8 bg-[#F9F7F5] text-muted-foreground",
              )}>
                <JourneyIconGlyph icon={icon} weight={iconWeight} className="h-4 w-4" />
              </span>
              <span className="mt-1.5 min-w-0 text-center">
                <span className={cn("block line-clamp-2 text-[9px] font-black leading-3 sm:text-[10px]", complete || current ? "text-charcoal" : "text-muted-foreground")}>{stage.label}</span>
                {stage.detail ? <span className={cn("mt-0.5 line-clamp-2 text-[8px] font-semibold leading-3 text-muted-foreground", showDetails ? "block" : "hidden sm:block")}>{stage.detail}</span> : null}
              </span>
            </>
          );

          return (
            <li key={stage.id} className="relative min-w-0">
              {index > 0 ? <span className={cn("absolute right-1/2 top-4 h-px w-full", !interrupted && index <= currentIndex ? "bg-burgundy/75" : "bg-border")} aria-hidden="true" /> : null}
              {current ? <span className={cn("absolute inset-x-3 top-[-0.65rem] h-[3px] rounded-b-full", interrupted ? "bg-destructive" : "bg-gold")} aria-hidden="true" /> : null}
              {onStageSelect ? (
                <button
                  type="button"
                  onClick={() => selectable && onStageSelect(index)}
                  disabled={!selectable}
                  aria-current={current ? "step" : undefined}
                  aria-label={stage.detail ? `${stage.label}. ${stage.detail}` : stage.label}
                  className="relative z-10 flex min-h-[4.25rem] w-full min-w-0 flex-col items-center px-1 py-1 disabled:cursor-default"
                >
                  {content}
                </button>
              ) : (
                <div aria-current={current ? "step" : undefined} className="relative z-10 flex min-h-[4.25rem] min-w-0 flex-col items-center px-1 py-1">
                  {content}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
