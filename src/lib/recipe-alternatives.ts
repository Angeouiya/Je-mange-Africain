const MAX_RECIPE_ALTERNATIVES = 8;

export function parseRecipeAlternativeIds(value: unknown): string[] {
  if (!value) return [];
  let parsed: unknown = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];
  return Array.from(new Set(parsed.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean))).slice(0, MAX_RECIPE_ALTERNATIVES);
}

export function serializeRecipeAlternativeIds(value: string[]): string | null {
  const alternatives = parseRecipeAlternativeIds(value);
  return alternatives.length ? JSON.stringify(alternatives) : null;
}
