import type { IconFunction } from "reicon/createIcon";
import { Bag } from "reicon/icons/Bag";
import { Basket } from "reicon/icons/Basket";
import { Bottle } from "reicon/icons/Bottle";
import { Box } from "reicon/icons/Box";
import { Cake } from "reicon/icons/Cake";
import { ChefHat } from "reicon/icons/ChefHat";
import { ChefHat2 } from "reicon/icons/ChefHat2";
import { CupHot } from "reicon/icons/CupHot";
import { Fire } from "reicon/icons/Fire";
import { FoodTray } from "reicon/icons/FoodTray";
import { ForkKnife } from "reicon/icons/ForkKnife";
import { Leaf } from "reicon/icons/Leaf";
import { cn } from "@/lib/utils";
import { getBrandAccentColor } from "@/lib/market-media";
import { ReiconGlyph } from "@/components/ui/reicon-glyph";

const categoryIcons: Record<string, IconFunction> = {
  manioc: Leaf,
  farines: Box,
  feculents: Basket,
  viandes: FoodTray,
  poissons: ForkKnife,
  legumes: Leaf,
  sauces: ChefHat2,
  epices: Fire,
  legumineuses: Bag,
  boissons: Bottle,
  desserts: Cake,
  cafe: CupHot,
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

const categoryMotifs: Record<string, { top: string; bottom: string }> = {
  manioc: { top: "M", bottom: "01" },
  farines: { top: "GR", bottom: "02" },
  feculents: { top: "FX", bottom: "03" },
  viandes: { top: "VT", bottom: "04" },
  poissons: { top: "PM", bottom: "05" },
  legumes: { top: "LF", bottom: "06" },
  sauces: { top: "SC", bottom: "07" },
  epices: { top: "EP", bottom: "08" },
  legumineuses: { top: "LG", bottom: "09" },
  boissons: { top: "BX", bottom: "10" },
  desserts: { top: "DS", bottom: "11" },
  cafe: { top: "CF", bottom: "12" },
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
  if (/(legumineuse|bean|haricot|arachide|peanut|graine|seed|(?:^|-)pois(?:-|$))/.test(key)) return "legumineuses";
  if (/(farine|cereal|cereale|grain|fonio|mil|sorgho)/.test(key)) return "farines";
  if (/(feculent|staple|riz|plantain|igname|patate)/.test(key)) return "feculents";
  if (/(viande|meat|boeuf|beef|poulet|chicken|agneau|goat|chevre)/.test(key)) return "viandes";
  if (/(poisson|fish|seafood|mer|thon|tilapia|crevette)/.test(key)) return "poissons";
  if (/(legume|vegetable|feuille|leaf|gombo|aubergine)/.test(key)) return "legumes";
  if (/(sauce|mijote|stew|soupe|soup)/.test(key)) return "sauces";
  if (/(epice|spice|condiment|piment|akpi|soumbala)/.test(key)) return "epices";
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
  const motif = categoryMotifs[visualKey] || { top: "JMA", bottom: "AF" };
  return (
    <span
      className={cn(
        "relative isolate grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-md border bg-white shadow-[0_12px_26px_-22px_rgba(90,38,50,0.58)] transition duration-200 before:absolute before:inset-y-1 before:left-1 before:w-px before:rounded-full before:bg-current/24 after:absolute after:inset-x-1.5 after:bottom-1 after:h-px after:rounded-full after:bg-current/18",
        active && "scale-[1.04] ring-1 ring-white/70",
        className,
      )}
      style={{
        color: resolvedColor,
        borderColor: active ? "rgba(255,255,255,0.7)" : `color-mix(in srgb, ${resolvedColor} 28%, white)`,
        background: "#FFFFFF",
      }}
      aria-hidden="true"
      data-testid="category-icon"
      data-category-key={visualKey || "generic"}
    >
      <span className="absolute inset-0 bg-current opacity-[0.035]" />
      <span className="absolute right-1 top-1 text-[5px] font-black leading-none tracking-normal opacity-45">{motif.top}</span>
      <span className="absolute bottom-1 left-1.5 text-[5px] font-black leading-none tracking-normal opacity-35">{motif.bottom}</span>
      <span className="absolute inset-1.5 rounded-[6px] border border-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.94)]" />
      <ReiconGlyph icon={Icon} weight="Filled" className="relative h-[19px] w-[19px] drop-shadow-[0_1px_0_rgba(255,255,255,0.82)]" />
    </span>
  );
}
