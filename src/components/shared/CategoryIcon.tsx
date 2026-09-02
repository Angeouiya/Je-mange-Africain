import { Beef, CircleDot, CookingPot, Fish, GlassWater, Leaf, Sprout, Wheat } from "lucide-react";
import { cn } from "@/lib/utils";
import { getBrandAccentColor } from "@/lib/market-media";

const categoryIcons = {
  manioc: Sprout,
  farines: Wheat,
  viandes: Beef,
  poissons: Fish,
  legumes: Leaf,
  sauces: CookingPot,
  legumineuses: CircleDot,
  boissons: GlassWater,
};

const categoryColors: Record<string, string> = {
  manioc: "#D65A32",
  farines: "#C88A00",
  viandes: "#B9382B",
  poissons: "#326B8A",
  legumes: "#8A3042",
  sauces: "#C34B29",
  legumineuses: "#8B5E21",
  boissons: "#A83B68",
};

export function CategoryIcon({ slug, color, className }: { slug?: string; color?: string | null; className?: string }) {
  const Icon = categoryIcons[slug as keyof typeof categoryIcons] || CookingPot;
  const resolvedColor = getBrandAccentColor(categoryColors[slug || ""] || color || "#D65A32");
  return (
    <span
      className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-md border border-white/55 shadow-sm", className)}
      style={{ color: resolvedColor, backgroundColor: `color-mix(in srgb, ${resolvedColor} 13%, white)` }}
      aria-hidden="true"
    >
      <Icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
    </span>
  );
}
