import { buildRecipeStepGuide, type RecipeStepDetails, type RecipeStepHeat } from "@/lib/recipe-step-guide";

type Locale = "fr" | "en";

export type StoredRecipeStep = Required<Pick<RecipeStepDetails, "durationMinutes" | "restMinutes" | "heat">> & {
  version: 1;
  instruction: string;
  temperatureC: number | null;
  equipment: string | null;
  cue: string;
  tip: string;
  warning: string | null;
};

const HEAT_LEVELS = new Set<RecipeStepHeat>(["none", "low", "medium", "high", "oven"]);

function objectDetails(value: Record<string, unknown>): RecipeStepDetails {
  return {
    durationMinutes: typeof value.durationMinutes === "number" ? value.durationMinutes : null,
    restMinutes: typeof value.restMinutes === "number" ? value.restMinutes : null,
    heat: typeof value.heat === "string" && HEAT_LEVELS.has(value.heat as RecipeStepHeat) ? value.heat as RecipeStepHeat : null,
    temperatureC: typeof value.temperatureC === "number" ? value.temperatureC : null,
    equipment: typeof value.equipment === "string" ? value.equipment : null,
    cue: typeof value.cue === "string" ? value.cue : null,
    tip: typeof value.tip === "string" ? value.tip : null,
    warning: typeof value.warning === "string" ? value.warning : null,
  };
}

function normaliseStep(instruction: string, index: number, locale: Locale, details?: RecipeStepDetails): StoredRecipeStep {
  const guide = buildRecipeStepGuide(instruction, index, locale, details);
  return {
    version: 1,
    instruction: guide.instruction,
    durationMinutes: guide.durationMinutes,
    restMinutes: guide.restMinutes,
    heat: guide.heat,
    temperatureC: guide.temperatureC,
    equipment: guide.equipment,
    cue: guide.cue,
    tip: guide.tip,
    warning: guide.warning,
  };
}

export function parseRecipeSteps(serialized: string | null | undefined, locale: Locale): StoredRecipeStep[] {
  try {
    const values: unknown = JSON.parse(serialized || "[]");
    if (!Array.isArray(values)) return [];
    return values.flatMap((value, index) => {
      if (typeof value === "string" && value.trim()) return [normaliseStep(value, index, locale)];
      if (!value || typeof value !== "object") return [];
      const record = value as Record<string, unknown>;
      if (typeof record.instruction !== "string" || !record.instruction.trim()) return [];
      return [normaliseStep(record.instruction, index, locale, objectDetails(record))];
    });
  } catch {
    return [];
  }
}

export function serializeRecipeSteps(instructions: string[], details: RecipeStepDetails[], locale: Locale) {
  return JSON.stringify(instructions.map((instruction, index) => normaliseStep(instruction, index, locale, details[index])));
}

export function publicStepDetails(steps: StoredRecipeStep[]): RecipeStepDetails[] {
  return steps.map(({ durationMinutes, restMinutes, heat, temperatureC, equipment, cue, tip, warning }) => ({
    durationMinutes,
    restMinutes,
    heat,
    temperatureC,
    equipment,
    cue,
    tip,
    warning,
  }));
}
