"use client";

import { Heart } from "reicon/icons/Heart";
import { Button } from "@/components/ui/button";
import { ReiconGlyph } from "@/components/ui/reicon-glyph";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

interface FavoriteButtonProps {
  productId: string;
  className?: string;
  size?: "sm" | "md";
}

export function FavoriteButton({ productId, className, size = "md" }: FavoriteButtonProps) {
  const fav = useStore((s) => s.favorites.includes(productId));
  const toggle = useStore((s) => s.toggleFavorite);
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={fav ? "Retirer des favoris" : "Ajouter aux favoris"}
      className={cn(
        "rounded-md border border-burgundy/10 bg-white/92 text-muted-foreground shadow-[0_10px_24px_-20px_rgba(90,38,50,0.65)] backdrop-blur hover:border-burgundy/20 hover:bg-white hover:text-burgundy",
        fav && "border-burgundy/20 bg-[linear-gradient(145deg,rgba(185,71,43,0.12),rgba(242,169,0,0.08))] text-burgundy",
        size === "sm" ? "size-8" : "size-9",
        className
      )}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(productId);
      }}
    >
      <ReiconGlyph icon={Heart} weight={fav ? "Filled" : "Outline"} className="size-4" />
    </Button>
  );
}
