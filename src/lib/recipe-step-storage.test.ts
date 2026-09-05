import { describe, expect, it } from "vitest";
import { parseRecipeSteps, publicStepDetails, serializeRecipeSteps } from "./recipe-step-storage";

describe("recipe step storage", () => {
  it("keeps legacy string steps readable with generated guidance", () => {
    const steps = parseRecipeSteps('["Émincer les oignons."]', "fr");

    expect(steps[0]).toMatchObject({ instruction: "Émincer les oignons.", durationMinutes: 6, heat: "none" });
    expect(steps[0].cue).toContain("réguliers");
  });

  it("round-trips authored timing, equipment and visible result", () => {
    const serialized = serializeRecipeSteps(["Mijoter doucement."], [{
      durationMinutes: 25,
      restMinutes: 8,
      heat: "low",
      temperatureC: 90,
      equipment: "Cocotte",
      cue: "La sauce nappe la cuillère sans couler immédiatement.",
      tip: "Remuer depuis le fond.",
      warning: "Attention à la vapeur.",
      title: "Lier la sauce",
      why: "La cuisson douce concentre les saveurs sans brûler le fond.",
      recovery: "Ajouter une cuillère d'eau chaude si la sauce épaissit trop.",
      ingredientProductIds: ["palm-nut", "fish"],
    }], "fr");
    const steps = parseRecipeSteps(serialized, "fr");

    expect(steps[0]).toMatchObject({ durationMinutes: 25, restMinutes: 8, temperatureC: 90, equipment: "Cocotte" });
    expect(publicStepDetails(steps)[0].cue).toContain("nappe la cuillère");
    expect(publicStepDetails(steps)[0]).toMatchObject({ title: "Lier la sauce", ingredientProductIds: ["palm-nut", "fish"] });
    expect(publicStepDetails(steps)[0].recovery).toContain("eau chaude");
  });

  it("discards malformed records without failing the whole recipe", () => {
    expect(parseRecipeSteps('[null,{"instruction":12},{"instruction":"Servir immédiatement."}]', "fr")).toHaveLength(1);
    expect(parseRecipeSteps("not-json", "fr")).toEqual([]);
  });
});
