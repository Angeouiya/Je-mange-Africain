import type { IconFunction } from "reicon/createIcon";
import { Basket } from "reicon/icons/Basket";
import { Bottle } from "reicon/icons/Bottle";
import { ChefHat } from "reicon/icons/ChefHat";
import { ChefHat2 } from "reicon/icons/ChefHat2";
import { Coffee } from "reicon/icons/Coffee";
import { FoodTray } from "reicon/icons/FoodTray";
import { ForkKnife } from "reicon/icons/ForkKnife";
import { Glass } from "reicon/icons/Glass";
import { Leaf } from "reicon/icons/Leaf";
import { Package } from "reicon/icons/Package";
import { Plate } from "reicon/icons/Plate";
import { cn } from "@/lib/utils";
import { getBrandAccentColor } from "@/lib/market-media";
import { ReiconGlyph } from "@/components/ui/reicon-glyph";

const categoryIcons: Record<string, IconFunction> = {
  manioc: Leaf,
  farines: Package,
  feculents: Basket,
  viandes: FoodTray,
  poissons: ForkKnife,
  legumes: Leaf,
  sauces: ChefHat2,
  epices: ChefHat,
  legumineuses: Plate,
  boissons: Bottle,
  desserts: Glass,
  cafe: Coffee,
};

const categoryColors: Record<string, string> = {
  manioc: "#D65A32",
  farines: "#F2A900",
  feculents: "#B9472B",
  viandes: "#C92A3E",
  poissons: "#A73E22",
  legumes: "#8A3042",
  sauces: "#D65A32",
  epices: "#C92A3E",
  legumineuses: "#8A3042",
  boissons: "#C92A3E",
  desserts: "#E66A3A",
  cafe: "#8A3042",
};

export function categoryVisualKey(value?: string | null) {
  const key = (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!key) return "";
  if (/(manioc|cassava|attieke|placali|tapioca)/.test(key)) return "manioc";
  if (/(farine|cereal|cereale|grain|fonio|mil|sorgho)/.test(key)) return "farines";
  if (/(feculent|staple|riz|plantain|igname|patate)/.test(key)) return "feculents";
  if (/(viande|meat|boeuf|beef|poulet|chicken|agneau|goat|chevre)/.test(key)) return "viandes";
  if (/(poisson|fish|seafood|mer|thon|tilapia|crevette)/.test(key)) return "poissons";
  if (/(legume|vegetable|feuille|leaf|gombo|aubergine)/.test(key)) return "legumes";
  if (/(epice|spice|condiment|piment|akpi|soumbala)/.test(key)) return "epices";
  if (/(sauce|mijote|stew|soupe|soup)/.test(key)) return "sauces";
  if (/(legumineuse|bean|haricot|pois|arachide|peanut)/.test(key)) return "legumineuses";
  if (/(boisson|drink|jus|juice|bissap|gingembre)/.test(key)) return "boissons";
  if (/(dessert|sucre|sweet|patisserie)/.test(key)) return "desserts";
  if (/(cafe|coffee|the|tea|infusion)/.test(key)) return "cafe";
  return key;
}

export function CategoryIcon({
  slug,
  label,
  color,
  active = false,
  className,
}: {
  slug?: string;
  label?: string | null;
  color?: string | null;
  active?: boolean;
  className?: string;
}) {
  const visualKey = categoryVisualKey(slug || label);
  const Icon = categoryIcons[visualKey] || ChefHat;
  const resolvedColor = getBrandAccentColor(categoryColors[visualKey] || color || "#D65A32");
  return (
    <span
      className={cn(
        "relative isolate grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-md border bg-white shadow-[0_12px_26px_-19px_rgba(90,38,50,0.72)] transition duration-200",
        active && "ring-1 ring-white/70",
        className,
      )}
      style={{
        color: resolvedColor,
        borderColor: active ? "rgba(255,255,255,0.7)" : `color-mix(in srgb, ${resolvedColor} 28%, white)`,
        background: active
          ? `linear-gradient(145deg, #fff 0%, #FFF8F4 58%, color-mix(in srgb, ${resolvedColor} 13%, white) 100%)`
          : `linear-gradient(145deg, color-mix(in srgb, ${resolvedColor} 16%, white), #fff 50%, color-mix(in srgb, ${resolvedColor} 9%, white))`,
      }}
      aria-hidden="true"
      data-testid="category-icon"
      data-category-key={visualKey || "generic"}
    >
      <span className="absolute inset-0 bg-[radial-gradient(circle_at_32%_22%,rgba(255,255,255,0.94),transparent_43%)]" />
      <span className="absolute inset-x-1 top-1 h-px rounded-full bg-current opacity-60" />
      <span className="absolute bottom-1 left-1 h-1.5 w-1.5 rounded-sm bg-current opacity-20" />
      <span className="absolute bottom-1 right-1 h-2 w-2 rounded-full bg-current opacity-25" />
      <ReiconGlyph icon={Icon} weight="Filled" className="relative h-[20px] w-[20px]" />
    </span>
  );
}
