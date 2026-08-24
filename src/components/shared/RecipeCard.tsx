"use client";

import { motion } from "framer-motion";
import { Clock, Users, Flame, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProductImage } from "./ProductImage";
import { useStore } from "@/lib/store";
import { dict } from "@/lib/i18n";
import { getRecipePhoto } from "@/lib/market-media";

export interface RecipeListItem {
  id: string;
  slug?: string;
  country: string;
  category: string;
  difficulty: string;
  timeMinutes: number;
  baseServings: number;
  imageColor: string;
  imageEmoji: string;
  isPopular?: boolean;
  title: string;
  description?: string;
  ingredientCount?: number;
}

export function RecipeCard({ recipe, index = 0 }: { recipe: RecipeListItem; index?: number }) {
  const locale = useStore((s) => s.locale);
  const navigate = useStore((s) => s.navigate);
  const t = dict[locale];

  const diff = recipe.difficulty === "easy" ? t.recipes.easy : recipe.difficulty === "hard" ? t.recipes.hard : t.recipes.medium;
  const photoUrl = getRecipePhoto(recipe);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.4) }}
      className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-all hover:-translate-y-0.5 hover:border-forest/30 hover:shadow-lg"
    >
      <div className="relative flex aspect-[4/3] items-center justify-center bg-muted/40">
        <ProductImage
          src={photoUrl}
          alt={recipe.title}
          emoji={recipe.imageEmoji}
          color={recipe.imageColor}
          size="lg"
          className="h-full w-full"
          rounded="rounded-none"
        />
        {recipe.isPopular && (
          <Badge className="absolute left-3 top-3 bg-terre text-cream border-0 shadow-sm">★ {t.recipes.popular}</Badge>
        )}
        <Badge variant="outline" className="absolute right-3 top-3 bg-white/80 backdrop-blur">{recipe.country}</Badge>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="text-base font-bold leading-tight text-charcoal">{recipe.title}</h3>
        {recipe.description && <p className="line-clamp-2 text-xs text-muted-foreground">{recipe.description}</p>}
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {recipe.timeMinutes} min</span>
          <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> {recipe.baseServings} {t.config.peopleUnit}</span>
          <span className="inline-flex items-center gap-1"><Flame className="h-3 w-3" /> {diff}</span>
        </div>
        <Button
          onClick={() => navigate("recipe-config", { recipeId: recipe.id })}
          className="mt-3 w-full bg-forest text-cream hover:bg-forest-dark"
        >
          {t.recipes.configure}
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
}
