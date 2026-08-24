"use client";

import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
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
        "rounded-full bg-background/80 backdrop-blur hover:bg-background shadow-sm",
        size === "sm" ? "size-8" : "size-9",
        className
      )}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(productId);
      }}
    >
      <Heart
        className={cn("size-4", fav ? "text-destructive fill-destructive" : "text-muted-foreground")}
      />
    </Button>
  );
}
