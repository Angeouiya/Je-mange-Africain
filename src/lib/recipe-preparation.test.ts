import { describe, expect, it } from "vitest";
import { getPreparationProgress, togglePreparationStep } from "./recipe-preparation";

describe("recipe preparation progress", () => {
  it("normalises completed steps and focuses the first unfinished action", () => {
    expect(getPreparationProgress(5, [3, 1, 1, -1, 8])).toEqual({
      totalSteps: 5,
      completedSteps: [1, 3],
      completedCount: 2,
      progressPercent: 40,
      nextStepIndex: 0,
      lastCompletedStepIndex: 3,
      isComplete: false,
    });
  });

  it("recognises a fully completed preparation", () => {
    expect(getPreparationProgress(3, [0, 1, 2])).toMatchObject({
      completedCount: 3,
      progressPercent: 100,
      nextStepIndex: null,
      isComplete: true,
    });
  });

  it("toggles a valid step while preserving a sorted unique state", () => {
    expect(togglePreparationStep(4, [2, 0], 1)).toEqual([0, 1, 2]);
    expect(togglePreparationStep(4, [2, 0], 2)).toEqual([0]);
    expect(togglePreparationStep(4, [0], 7)).toEqual([0]);
  });
});
