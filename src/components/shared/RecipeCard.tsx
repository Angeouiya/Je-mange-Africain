"use client";

import { motion } from "framer-motion";
import { Bookmark, Clock, Users, Flame, ChevronRight, Star } from "lucide-react";
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
  imageUrl?: string | null;
  isPopular?: boolean;
  title: string;
  description?: string;
  ingredientCount?: number;
}

export function RecipeCard({ recipe, index = 0, compact = false }: { recipe: RecipeListItem; index?: number; compact?: boolean }) {
  const locale = useStore((s) => s.locale);
  const navigate = useStore((s) => s.navigate);
  const savedRecipes = useStore((s) => s.savedRecipes);
  const toggleSavedRecipe = useStore((s) => s.toggleSavedRecipe);
  const t = dict[locale];

  const diff = recipe.difficulty === "easy" ? t.recipes.easy : recipe.difficulty === "hard" ? t.recipes.hard : t.recipes.medium;
  const photoUrl = recipe.imageUrl || getRecipePhoto(recipe);
  const isSaved = savedRecipes.includes(recipe.id);

  return (
    <motion.div
      initial={{ y: 10 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.4) }}
      className="group flex flex-col overflow-hidden rounded-lg border border-charcoal/10 bg-white transition-all hover:-translate-y-0.5 hover:border-forest/30 hover:shadow-[0_22px_50px_-34px_rgba(24,26,24,0.55)]"
    >
      <div className={`relative flex items-center justify-center bg-muted/40 ${compact ? "aspect-[16/9]" : "aspect-[16/10]"}`}>
        <ProductImage
          src={photoUrl}
          fallbackSrc="/hero-feast-v2.webp"
          alt={recipe.title}
          emoji={recipe.imageEmoji}
          color={recipe.imageColor}
          size="lg"
          className="h-full w-full"
          rounded="rounded-none"
          priority={index < 2}
        />
        {recipe.isPopular && (
          <Badge className="absolute left-3 top-3 border-0 bg-terre text-cream shadow-sm"><Star className="mr-1 h-3 w-3 fill-current" /> {t.recipes.popular}</Badge>
        )}
        <Badge variant="outline" className="absolute bottom-3 left-3 max-w-[calc(100%-4.5rem)] truncate bg-white/90 backdrop-blur">{recipe.country}</Badge>
        <button
          type="button"
          onClick={() => toggleSavedRecipe(recipe.id)}
          aria-pressed={isSaved}
          aria-label={isSaved
            ? (locale === "fr" ? `Retirer ${recipe.title} des recettes sauvegardées` : `Remove ${recipe.title} from saved recipes`)
            : (locale === "fr" ? `Sauvegarder la recette ${recipe.title}` : `Save the ${recipe.title} recipe`)}
          title={isSaved ? (locale === "fr" ? "Retirer" : "Remove") : (locale === "fr" ? "Sauvegarder" : "Save")}
          className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-md border border-black/10 bg-white/95 text-charcoal shadow-sm backdrop-blur transition hover:border-terre/35 hover:text-terre"
        >
          <Bookmark className={`h-4 w-4 ${isSaved ? "fill-terre text-terre" : ""}`} />
        </button>
      </div>
      <div className={`flex flex-1 flex-col gap-2 ${compact ? "p-3" : "p-4"}`}>
        <h3 className={`font-display font-semibold leading-tight text-charcoal ${compact ? "text-base" : "text-lg"}`}>{recipe.title}</h3>
        {!compact && recipe.description ? <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">{recipe.description}</p> : null}
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {recipe.timeMinutes} min</span>
          <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> {recipe.baseServings} {t.config.peopleUnit}</span>
          <span className="inline-flex items-center gap-1"><Flame className="h-3 w-3" /> {diff}</span>
        </div>
        <Button
          onClick={() => navigate("recipe-config", { recipeId: recipe.id })}
          className={`${compact ? "mt-1 h-9 text-xs" : "mt-3 h-10"} w-full bg-forest text-white hover:bg-forest-dark`}
        >
          {t.recipes.configure}
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
}
