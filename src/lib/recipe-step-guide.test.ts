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
    expect(guide.cue).toContain("peau dorée");
  });

  it("adds useful guidance to a legacy short instruction", () => {
    const guide = buildRecipeStepGuide("Émincer les oignons.", 0, "fr");

    expect(guide.durationLabel).toBe("≈ 6 min");
    expect(guide.durationEstimated).toBe(true);
    expect(guide.heat).toBe("none");
    expect(guide.cue).toContain("réguliers");
    expect(guide.tip.length).toBeGreaterThan(30);
    expect(guide.why).toContain("même rythme");
    expect(guide.recovery).toContain("Recoupez");
    expect(guide.equipment).toContain("couteau");
    expect(guide.phaseLabel).toBe("Mise en place");
  });

  it("localises labels and emits an oil safety warning", () => {
    const guide = buildRecipeStepGuide("Fry the plantain in hot oil for 6 minutes until golden.", 2, "en");

    expect(guide.durationLabel).toBe("6 min");
    expect(guide.heatLabel).toBe("High heat");
    expect(guide.warning).toContain("water away from the oil");
    expect(guide.equipment).toContain("slotted spoon");
    expect(guide.phaseLabel).toBe("Cooking");
  });

  it("prioritises the cooking action when a short instruction also mentions serving", () => {
    const guide = buildRecipeStepGuide("Grill and serve with the attieke.", 0, "en");

    expect(guide.durationLabel).toBe("≈ 10 min");
    expect(guide.heat).toBe("high");
  });

  it("keeps a fish marinade cue focused on resting rather than final doneness", () => {
    const guide = buildRecipeStepGuide("Mariner le poisson 20 minutes pendant que le gril préchauffe.", 0, "fr");

    expect(guide.title).toBe("Laisser agir et préchauffer");
    expect(guide.durationMinutes).toBe(2);
    expect(guide.restMinutes).toBe(20);
    expect(guide.restLabel).toBe("20 min");
    expect(guide.cue).toContain("temps de repos");
    expect(guide.cue).not.toContain("chair est opaque");
  });

  it("keeps guide ordering and scores incomplete admin copy", () => {
    expect(buildRecipeStepGuides(["Cut the onion.", "Simmer for 20 minutes until glossy."], "en")).toHaveLength(2);
    expect(recipeStepDetailScore("Cut onion.")).toBeLessThan(2);
    expect(recipeStepDetailScore("Cook over low heat for 20 minutes until the sauce is glossy.")).toBe(4);
  });

  it("does not confuse French remaining ingredients with an English rest instruction", () => {
    const guide = buildRecipeStepGuide("Ajouter les oignons restants et mijoter 20 minutes à feu doux jusqu'à tendreté.", 4, "fr");

    expect(guide.title).toBe("Maîtriser la cuisson");
    expect(guide.cue).not.toContain("marinade");
  });

  it("provides a specific doneness cue for cassava leaves", () => {
    const guide = buildRecipeStepGuide("Faire bouillir les feuilles de manioc à découvert pendant 45 minutes.", 3, "fr");

    expect(guide.cue).toContain("toute la durée indiquée");
    expect(guide.cue).toContain("très tendres");
  });

  it("prefers the recipe's explicit result over an ingredient heuristic", () => {
    const guide = buildRecipeStepGuide("Ajouter le poisson fumé et mijoter 20 minutes jusqu'à des feuilles très tendres et sans eau libre.", 4, "fr");

    expect(guide.cue).toContain("feuilles très tendres");
    expect(guide.cue).not.toContain("chair est opaque");
  });

  it("uses authored professional cues instead of estimated guidance", () => {
    const guide = buildRecipeStepGuide("Cuire la sauce.", 2, "fr", {
      durationMinutes: 18,
      restMinutes: 5,
      heat: "low",
      temperatureC: 92,
      equipment: "Cocotte à fond épais et cuillère en bois",
      cue: "La sauce est brillante et laisse une trace nette sur la cuillère.",
      tip: "Ajouter le bouillon en trois fois.",
      warning: "Ouvrir la cocotte loin du visage.",
    });

    expect(guide).toMatchObject({
      durationLabel: "18 min",
      durationEstimated: false,
      restLabel: "5 min",
      heatLabel: "Feu doux",
      temperatureLabel: "92 °C",
      equipment: "Cocotte à fond épais et cuillère en bois",
    });
    expect(guide.cue).toContain("trace nette");
  });

  it("keeps authored titles, rationale, recovery and ingredient links", () => {
    const guide = buildRecipeStepGuide("Mijoter la sauce.", 2, "fr", {
      title: "Concentrer la sauce graine",
      why: "La réduction lente concentre les aromates sans brûler la base.",
      recovery: "Ajouter une cuillère d'eau chaude si la sauce devient trop épaisse.",
      ingredientProductIds: ["palm-nut", "fish", "palm-nut"],
    });

    expect(guide.title).toBe("Concentrer la sauce graine");
    expect(guide.why).toContain("réduction lente");
    expect(guide.recovery).toContain("eau chaude");
    expect(guide.ingredientProductIds).toEqual(["palm-nut", "fish"]);
  });
});
