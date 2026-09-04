import { describe, expect, it } from "vitest";
import { buildRecipeStepGuide, buildRecipeStepGuides, recipeStepDetailScore } from "./recipe-step-guide";

describe("recipe preparation guide", () => {
  it("extracts a duration range, side instruction and high heat", () => {
    const guide = buildRecipeStepGuide("Braiser le poisson 8 à 12 minutes par face jusqu'à obtenir une peau dorée.", 1, "fr");

    expect(guide).toMatchObject({
      durationLabel: "8-12 min / face",
      durationMinutes: 10,
      durationEstimated: false,
      heat: "high",
      heatLabel: "Feu vif",
      title: "Saisir et colorer",
      detailScore: 4,
    });
    expect(guide.cue).toContain("chair");
  });

  it("adds useful guidance to a legacy short instruction", () => {
    const guide = buildRecipeStepGuide("Émincer les oignons.", 0, "fr");

    expect(guide.durationLabel).toBe("≈ 6 min");
    expect(guide.durationEstimated).toBe(true);
    expect(guide.heat).toBe("none");
    expect(guide.cue).toContain("réguliers");
    expect(guide.tip.length).toBeGreaterThan(30);
  });

  it("localises labels and emits an oil safety warning", () => {
    const guide = buildRecipeStepGuide("Fry the plantain in hot oil for 6 minutes until golden.", 2, "en");

    expect(guide.durationLabel).toBe("6 min");
    expect(guide.heatLabel).toBe("High heat");
    expect(guide.warning).toContain("water away from the oil");
  });

  it("prioritises the cooking action when a short instruction also mentions serving", () => {
    const guide = buildRecipeStepGuide("Grill and serve with the attieke.", 0, "en");

    expect(guide.durationLabel).toBe("≈ 10 min");
    expect(guide.heat).toBe("high");
  });

  it("keeps a fish marinade cue focused on resting rather than final doneness", () => {
    const guide = buildRecipeStepGuide("Mariner le poisson 20 minutes pendant que le gril préchauffe.", 0, "fr");

    expect(guide.title).toBe("Laisser agir et préchauffer");
    expect(guide.cue).toContain("temps de repos");
    expect(guide.cue).not.toContain("chair est opaque");
  });

  it("keeps guide ordering and scores incomplete admin copy", () => {
    expect(buildRecipeStepGuides(["Cut the onion.", "Simmer for 20 minutes until glossy."], "en")).toHaveLength(2);
    expect(recipeStepDetailScore("Cut onion.")).toBeLessThan(2);
    expect(recipeStepDetailScore("Cook over low heat for 20 minutes until the sauce is glossy.")).toBe(4);
  });
});
