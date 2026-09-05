import { describe, expect, it } from "vitest";
import { DISH_LIBRARY } from "./dish-library";

function wordCount(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

describe("dish library editorial quality", () => {
  it("keeps every preparation detailed and aligned in both languages", () => {
    expect(DISH_LIBRARY.length).toBeGreaterThanOrEqual(20);

    for (const dish of DISH_LIBRARY) {
      expect(dish.steps.length, `${dish.slug} needs at least five preparation steps`).toBeGreaterThanOrEqual(5);

      for (const [index, step] of dish.steps.entries()) {
        expect(wordCount(step.fr), `${dish.slug} French step ${index + 1} is too brief`).toBeGreaterThanOrEqual(20);
        expect(wordCount(step.en), `${dish.slug} English step ${index + 1} is too brief`).toBeGreaterThanOrEqual(20);
        expect(step.fr.length, `${dish.slug} French step ${index + 1} exceeds the admin field`).toBeLessThanOrEqual(800);
        expect(step.en.length, `${dish.slug} English step ${index + 1} exceeds the admin field`).toBeLessThanOrEqual(800);
      }
    }
  });
});
