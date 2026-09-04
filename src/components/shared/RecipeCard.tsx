"use client";

import { motion } from "framer-motion";
import { Bookmark, Clock, Users, Flame, ChevronRight, Sparkles, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProductImage } from "./ProductImage";
import { useStore } from "@/lib/store";
import { dict } from "@/lib/i18n";
import { getRecipePhoto } from "@/lib/market-media";
import { recipeEditorialHighlight } from "@/lib/editorial-flags";

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
  isRecommended?: boolean;
  isNew?: boolean;
  title: string;
  description?: string;
  ingredientCount?: number;
}

type RecipeCardSurfaceProps = {
  recipe: RecipeListItem;
  locale: "fr" | "en";
  compact: boolean;
  index?: number;
  isSaved?: boolean;
  onConfigure?: () => void;
  onSave?: () => void;
};

const recipeCardFrame = (compact: boolean) =>
  `group flex flex-col overflow-hidden border border-charcoal/10 bg-white transition-all hover:-translate-y-0.5 hover:border-burgundy/30 hover:shadow-[0_22px_50px_-34px_rgba(63,41,48,0.55)] ${compact ? "rounded-md [contain-intrinsic-size:390px] [content-visibility:auto]" : "rounded-lg"}`;

export function RecipeCard({ recipe, index = 0, compact = false }: { recipe: RecipeListItem; index?: number; compact?: boolean }) {
  const locale = useStore((s) => s.locale);
  const navigate = useStore((s) => s.navigate);
  const savedRecipes = useStore((s) => s.savedRecipes);
  const toggleSavedRecipe = useStore((s) => s.toggleSavedRecipe);
  const isSaved = savedRecipes.includes(recipe.id);

  return (
    <motion.div
      initial={{ y: 10 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.4) }}
      className={recipeCardFrame(compact)}
    >
      <RecipeCardSurface recipe={recipe} locale={locale} compact={compact} index={index} isSaved={isSaved} onSave={() => toggleSavedRecipe(recipe.id)} onConfigure={() => navigate("recipe-config", { recipeId: recipe.id })} />
    </motion.div>
  );
}

export function RecipeCardPreview({ recipe, locale, compact = true }: { recipe: RecipeListItem; locale: "fr" | "en"; compact?: boolean }) {
  return (
    <div className={recipeCardFrame(compact)} data-testid="storefront-recipe-card-preview">
      <RecipeCardSurface recipe={recipe} locale={locale} compact={compact} />
    </div>
  );
}

function RecipeCardSurface({ recipe, locale, compact, index = 0, isSaved = false, onConfigure, onSave }: RecipeCardSurfaceProps) {
  const t = dict[locale];
  const diff = recipe.difficulty === "easy" ? t.recipes.easy : recipe.difficulty === "hard" ? t.recipes.hard : t.recipes.medium;
  const photoUrl = recipe.imageUrl || getRecipePhoto(recipe);
  const editorialHighlight = recipeEditorialHighlight(recipe);
  const editorialLabel = editorialHighlight === "popular"
    ? t.recipes.popular
    : editorialHighlight === "recommended"
      ? (locale === "fr" ? "Recommandée" : "Recommended")
      : editorialHighlight === "new"
        ? t.new
        : "";
  const interactive = Boolean(onConfigure && onSave);

  return (
    <>
      <div className={`relative flex items-center justify-center bg-muted/40 ${compact ? "aspect-[4/3]" : "aspect-[16/10]"}`}>
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
        {editorialHighlight ? (
          <Badge className={`absolute border-0 shadow-sm ${editorialHighlight === "new" ? "bg-gold text-charcoal" : editorialHighlight === "recommended" ? "bg-burgundy text-white" : "bg-terre text-cream"} ${compact ? "left-2 top-2 px-1.5 py-0.5 text-[8px]" : "left-3 top-3"}`}>
            {editorialHighlight === "popular" ? <Star className={`${compact ? "mr-0.5 h-2.5 w-2.5" : "mr-1 h-3 w-3"} fill-current`} /> : <Sparkles className={`${compact ? "mr-0.5 h-2.5 w-2.5" : "mr-1 h-3 w-3"}`} />}{editorialLabel}
          </Badge>
        ) : null}
        <Badge variant="outline" className={`absolute max-w-[calc(100%-4.5rem)] truncate bg-white/90 backdrop-blur ${compact ? "bottom-2 left-2 px-1.5 py-0.5 text-[8px]" : "bottom-3 left-3"}`}>{recipe.country}</Badge>
        {interactive ? (
          <button
            type="button"
            onClick={onSave}
            aria-pressed={isSaved}
            aria-label={isSaved
              ? (locale === "fr" ? `Retirer ${recipe.title} des recettes sauvegardées` : `Remove ${recipe.title} from saved recipes`)
              : (locale === "fr" ? `Sauvegarder la recette ${recipe.title}` : `Save the ${recipe.title} recipe`)}
            title={isSaved ? (locale === "fr" ? "Retirer" : "Remove") : (locale === "fr" ? "Sauvegarder" : "Save")}
            className={`absolute grid place-items-center rounded-md border border-charcoal/10 bg-white/95 text-charcoal shadow-sm backdrop-blur transition hover:border-terre/35 hover:text-terre ${compact ? "right-2 top-2 h-7 w-7" : "right-3 top-3 h-9 w-9"}`}
          >
            <Bookmark className={`h-4 w-4 ${isSaved ? "fill-terre text-terre" : ""}`} />
          </button>
        ) : (
          <span aria-hidden="true" className={`absolute grid place-items-center rounded-md border border-charcoal/10 bg-white/95 text-charcoal shadow-sm backdrop-blur ${compact ? "right-2 top-2 h-7 w-7" : "right-3 top-3 h-9 w-9"}`}><Bookmark className="h-4 w-4" /></span>
        )}
      </div>
      <div className={`flex flex-1 flex-col ${compact ? "gap-1 p-2.5" : "gap-2 p-4"}`}>
        <h3 className={`font-display font-semibold leading-tight text-charcoal ${compact ? "line-clamp-2 min-h-7 text-[12px]" : "text-lg"}`}>{recipe.title}</h3>
        {recipe.description ? <p className={`${compact ? "line-clamp-2 min-h-8 text-[10px] leading-4" : "line-clamp-2 text-xs leading-5"} text-muted-foreground`}>{recipe.description}</p> : null}
        <div className={`${compact ? "gap-x-2 text-[10px]" : "mt-1 gap-x-3 text-[11px]"} flex flex-wrap items-center gap-y-1 text-muted-foreground`}>
          <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {recipe.timeMinutes} min</span>
          <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> {recipe.baseServings} {t.config.peopleUnit}</span>
          <span className={`${compact ? "hidden sm:inline-flex" : "inline-flex"} items-center gap-1`}><Flame className="h-3 w-3" /> {diff}</span>
        </div>
        {interactive ? (
          <Button
            onClick={onConfigure}
            className={`${compact ? "mt-1 h-8 px-2 text-[10px]" : "mt-3 h-10"} w-full bg-burgundy text-white hover:bg-burgundy-dark`}
          >
            {t.recipes.configure}
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        ) : (
          <span aria-hidden="true" className={`${compact ? "mt-1 h-8 px-2 text-[10px]" : "mt-3 h-10"} flex w-full items-center justify-center rounded-md bg-burgundy font-semibold text-white`}>{t.recipes.configure}<ChevronRight className="ml-1 h-4 w-4" /></span>
        )}
      </div>
    </>
  );
}
