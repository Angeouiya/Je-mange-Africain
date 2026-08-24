"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Snowflake, Refrigerator, Flame } from "lucide-react";
import { useStore } from "@/lib/store";

interface ThermalBadgeProps {
  thermalClass: string;
  className?: string;
  showLabel?: boolean;
}

const icon: Record<string, JSX.Element> = {
  FROZEN: <Snowflake className="size-3" />,
  REFRIGERATED: <Refrigerator className="size-3" />,
  AMBIANT: <Flame className="size-3" />,
};

const colors: Record<string, string> = {
  FROZEN: "bg-blue-50 text-blue-700 border-blue-200",
  REFRIGERATED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  AMBIANT: "bg-amber-50 text-amber-700 border-amber-200",
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
    <Badge variant="outline" className={cn("border font-medium gap-1", c, className)}>
      {icon[thermalClass]}
      {showLabel && (labels[thermalClass]?.[locale] || thermalClass)}
    </Badge>
  );
}
