import { retailAvailableUnits } from "@/lib/inventory";

type RecipeStockIngredient = {
  optional?: boolean;
  product?: { stockQty?: number; reservedQty?: number; status?: string } | null;
};

export function recipeStockReadiness(ingredients: RecipeStockIngredient[]) {
  const required = ingredients.filter((ingredient) => !ingredient.optional);
  const available = required.filter((ingredient) =>
    retailAvailableUnits(Number(ingredient.product?.stockQty || 0), Number(ingredient.product?.reservedQty || 0)) > 0 && ingredient.product?.status !== "archived"
  );
  const stockCoverageRate = required.length > 0 ? Math.round((available.length / required.length) * 100) : 0;

  return {
    requiredIngredientCount: required.length,
    availableIngredientCount: available.length,
    stockCoverageRate,
    needsAttention: required.length === 0 || available.length < required.length,
  };
}

export function recipeStepCount(serializedSteps?: string | null) {
  try {
    const steps = JSON.parse(serializedSteps || "[]");
    return Array.isArray(steps) ? steps.filter((step) => (
      typeof step === "string" ? step.trim() : step && typeof step === "object" && typeof step.instruction === "string" && step.instruction.trim()
    )).length : 0;
  } catch {
    return 0;
  }
}
