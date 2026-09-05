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
    }], "fr");
    const steps = parseRecipeSteps(serialized, "fr");

    expect(steps[0]).toMatchObject({ durationMinutes: 25, restMinutes: 8, temperatureC: 90, equipment: "Cocotte" });
    expect(publicStepDetails(steps)[0].cue).toContain("nappe la cuillère");
  });

  it("discards malformed records without failing the whole recipe", () => {
    expect(parseRecipeSteps('[null,{"instruction":12},{"instruction":"Servir immédiatement."}]', "fr")).toHaveLength(1);
    expect(parseRecipeSteps("not-json", "fr")).toEqual([]);
  });
});
