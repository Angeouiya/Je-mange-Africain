export const PUBLISHED_RECIPE_MIN_STEPS = 5;
export const PUBLISHED_RECIPE_MIN_WORDS_PER_STEP = 16;

type PreparationStepDetail = {
  titleFr?: string | null;
  titleEn?: string | null;
  durationMinutes?: string | number | null;
  heat?: string | null;
  equipmentFr?: string | null;
  equipmentEn?: string | null;
  cueFr?: string | null;
  cueEn?: string | null;
  tipFr?: string | null;
  tipEn?: string | null;
  whyFr?: string | null;
  whyEn?: string | null;
  recoveryFr?: string | null;
  recoveryEn?: string | null;
  ingredientProductIds?: string[] | null;
};

type PreparationIngredient = {
  productId?: string | null;
  optional?: boolean | null;
};

export type RecipePreparationQualityInput = {
  stepsFr: string[];
  stepsEn: string[];
  stepDetails?: PreparationStepDetail[] | null;
  ingredients?: PreparationIngredient[] | null;
};

export type RecipePreparationQuality = {
  ready: boolean;
  score: number;
  requirements: {
    completeSequence: boolean;
    detailedBilingualInstructions: boolean;
    professionalGuidance: boolean;
    ingredientCoverage: boolean;
  };
  shortFrenchStepIndexes: number[];
  shortEnglishStepIndexes: number[];
  incompleteGuidanceStepIndexes: number[];
  unlinkedRequiredProductIds: string[];
};

const clean = (value: string | null | undefined) => value?.trim() || "";

export function recipePreparationWordCount(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function hasProfessionalGuidance(detail: PreparationStepDetail | undefined) {
  if (!detail) return false;
  return Number(detail.durationMinutes) >= 1
    && Boolean(detail.heat)
    && clean(detail.titleFr).length >= 3
    && clean(detail.titleEn).length >= 3
    && clean(detail.equipmentFr).length >= 3
    && clean(detail.equipmentEn).length >= 3
    && clean(detail.cueFr).length >= 10
    && clean(detail.cueEn).length >= 10
    && clean(detail.tipFr).length >= 10
    && clean(detail.tipEn).length >= 10
    && clean(detail.whyFr).length >= 10
    && clean(detail.whyEn).length >= 10
    && clean(detail.recoveryFr).length >= 10
    && clean(detail.recoveryEn).length >= 10;
}

export function assessRecipePreparationQuality(input: RecipePreparationQualityInput): RecipePreparationQuality {
  const stepCount = Math.max(input.stepsFr.length, input.stepsEn.length);
  const shortFrenchStepIndexes = input.stepsFr.flatMap((step, index) => (
    recipePreparationWordCount(step) < PUBLISHED_RECIPE_MIN_WORDS_PER_STEP ? [index] : []
  ));
  const shortEnglishStepIndexes = input.stepsEn.flatMap((step, index) => (
    recipePreparationWordCount(step) < PUBLISHED_RECIPE_MIN_WORDS_PER_STEP ? [index] : []
  ));
  const incompleteGuidanceStepIndexes = Array.from({ length: stepCount }, (_, index) => index)
    .filter((index) => !hasProfessionalGuidance(input.stepDetails?.[index]));
  const requiredProductIds = Array.from(new Set((input.ingredients || [])
    .filter((ingredient) => !ingredient.optional && clean(ingredient.productId))
    .map((ingredient) => clean(ingredient.productId))));
  const linkedProductIds = new Set((input.stepDetails || []).flatMap((detail) => detail.ingredientProductIds || []));
  const unlinkedRequiredProductIds = requiredProductIds.filter((productId) => !linkedProductIds.has(productId));

  const requirements = {
    completeSequence: input.stepsFr.length >= PUBLISHED_RECIPE_MIN_STEPS
      && input.stepsFr.length === input.stepsEn.length,
    detailedBilingualInstructions: input.stepsFr.length === input.stepsEn.length
      && shortFrenchStepIndexes.length === 0
      && shortEnglishStepIndexes.length === 0,
    professionalGuidance: Boolean(input.stepDetails)
      && input.stepDetails!.length === input.stepsFr.length
      && incompleteGuidanceStepIndexes.length === 0,
    ingredientCoverage: unlinkedRequiredProductIds.length === 0,
  };
  const completedRequirementCount = Object.values(requirements).filter(Boolean).length;

  return {
    ready: completedRequirementCount === Object.keys(requirements).length,
    score: Math.round((completedRequirementCount / Object.keys(requirements).length) * 100),
    requirements,
    shortFrenchStepIndexes,
    shortEnglishStepIndexes,
    incompleteGuidanceStepIndexes,
    unlinkedRequiredProductIds,
  };
}

export function recipePreparationPublicationConflict(quality: RecipePreparationQuality, locale: "fr" | "en" = "fr") {
  return {
    error: locale === "fr"
      ? "Publication impossible : détaillez et reliez toute la préparation avant de rendre la recette visible."
      : "Unable to publish: complete and link the full preparation before making the recipe visible.",
    preparationQuality: quality,
  };
}
