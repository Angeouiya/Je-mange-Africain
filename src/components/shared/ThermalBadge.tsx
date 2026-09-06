"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { IconFunction } from "reicon/createIcon";
import { CloudSnow } from "reicon/icons/CloudSnow";
import { Fire } from "reicon/icons/Fire";
import { Fridge } from "reicon/icons/Fridge";
import { ReiconGlyph } from "@/components/ui/reicon-glyph";
import { useStore } from "@/lib/store";

interface ThermalBadgeProps {
  thermalClass: string;
  className?: string;
  showLabel?: boolean;
}

const icons: Record<string, IconFunction> = {
  FROZEN: CloudSnow,
  REFRIGERATED: Fridge,
  AMBIANT: Fire,
};

const colors: Record<string, string> = {
  FROZEN: "bg-burgundy/8 text-burgundy border-burgundy/20",
  REFRIGERATED: "bg-terre/9 text-terre border-terre/22",
  AMBIANT: "bg-gold/15 text-charcoal border-gold/35",
};

const labels: Record<string, { fr: string; en: string }> = {
  FROZEN: { fr: "Surgelé", en: "Frozen" },
  REFRIGERATED: { fr: "Réfrigéré", en: "Chilled" },
  AMBIANT: { fr: "Ambiant", en: "Ambient" },
};

export function ThermalBadge({ thermalClass, className, showLabel = true }: ThermalBadgeProps) {
  const locale = useStore((s) => s.locale);
  const c = colors[thermalClass] || "bg-muted text-muted-foreground border-border";
  return (
    <Badge variant="outline" className={cn("gap-1 rounded-md border px-2 py-0.5 text-[10px] font-black shadow-[0_10px_22px_-22px_rgba(90,38,50,0.55)]", c, className)}>
      {icons[thermalClass] ? <ReiconGlyph icon={icons[thermalClass]} weight="Filled" className="size-3" /> : null}
      {showLabel && (labels[thermalClass]?.[locale] || thermalClass)}
    </Badge>
  );
}
