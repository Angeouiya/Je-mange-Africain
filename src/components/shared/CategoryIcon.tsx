import type { IconFunction } from "reicon/createIcon";
import { Bottle } from "reicon/icons/Bottle";
import { ChefHat } from "reicon/icons/ChefHat";
import { FoodTray } from "reicon/icons/FoodTray";
import { ForkKnife } from "reicon/icons/ForkKnife";
import { Leaf } from "reicon/icons/Leaf";
import { Package } from "reicon/icons/Package";
import { Plate } from "reicon/icons/Plate";
import { cn } from "@/lib/utils";
import { getBrandAccentColor } from "@/lib/market-media";
import { ReiconGlyph } from "@/components/ui/reicon-glyph";

const categoryIcons: Record<string, IconFunction> = {
  manioc: Leaf,
  farines: Package,
  viandes: FoodTray,
  poissons: ForkKnife,
  legumes: Leaf,
  sauces: ChefHat,
  legumineuses: Plate,
  boissons: Bottle,
};

const categoryColors: Record<string, string> = {
  manioc: "#D65A32",
  farines: "#F2A900",
  viandes: "#C92A3E",
  poissons: "#A73E22",
  legumes: "#8A3042",
  sauces: "#D65A32",
  legumineuses: "#8A3042",
  boissons: "#C92A3E",
};

export function CategoryIcon({ slug, color, className }: { slug?: string; color?: string | null; className?: string }) {
  const Icon = categoryIcons[slug || ""] || ChefHat;
  const resolvedColor = getBrandAccentColor(categoryColors[slug || ""] || color || "#D65A32");
  return (
    <span
      className={cn("relative isolate grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-md border bg-white shadow-[0_10px_24px_-17px_rgba(63,41,48,0.82)]", className)}
      style={{
        color: resolvedColor,
        borderColor: `color-mix(in srgb, ${resolvedColor} 24%, white)`,
        background: `linear-gradient(145deg, color-mix(in srgb, ${resolvedColor} 14%, white), #fff 52%, color-mix(in srgb, ${resolvedColor} 8%, white))`,
      }}
      aria-hidden="true"
    >
      <span className="absolute inset-0 bg-[radial-gradient(circle_at_32%_22%,rgba(255,255,255,0.94),transparent_43%)]" />
      <span className="absolute inset-x-1 top-1 h-px rounded-full bg-current opacity-55" />
      <span className="absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full bg-current opacity-25" />
      <ReiconGlyph icon={Icon} weight="Filled" className="relative h-[20px] w-[20px]" />
    </span>
  );
}
