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
  poissons: "#A73E22",
  legumes: "#8A3042",
  sauces: "#C34B29",
  legumineuses: "#8A3042",
  boissons: "#C92A3E",
};

export function CategoryIcon({ slug, color, className }: { slug?: string; color?: string | null; className?: string }) {
  const Icon = categoryIcons[slug as keyof typeof categoryIcons] || CookingPot;
  const resolvedColor = getBrandAccentColor(categoryColors[slug || ""] || color || "#D65A32");
  return (
    <span
      className={cn("relative isolate grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-md border shadow-[0_8px_20px_-15px_rgba(63,41,48,0.8)]", className)}
      style={{
        color: resolvedColor,
        borderColor: `color-mix(in srgb, ${resolvedColor} 18%, white)`,
        backgroundColor: `color-mix(in srgb, ${resolvedColor} 9%, white)`,
      }}
      aria-hidden="true"
    >
      <span className="absolute inset-x-0 top-0 h-[2px] bg-current opacity-75" />
      <Icon className="relative h-[19px] w-[19px]" strokeWidth={2} />
      <span className="absolute bottom-1.5 right-1.5 h-1 w-1 rounded-full bg-current opacity-35" />
    </span>
  );
}
