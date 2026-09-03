export function getPreparationProgress(stepCount: number, completedSteps: number[]) {
  const totalSteps = Math.max(0, Math.floor(stepCount));
  const completed = [...new Set(completedSteps)]
    .filter((index) => Number.isInteger(index) && index >= 0 && index < totalSteps)
    .sort((a, b) => a - b);
  const completedSet = new Set(completed);
  const nextStepIndex = Array.from({ length: totalSteps }, (_, index) => index)
    .find((index) => !completedSet.has(index)) ?? null;

  return {
    totalSteps,
    completedSteps: completed,
    completedCount: completed.length,
    progressPercent: totalSteps > 0 ? Math.round((completed.length / totalSteps) * 100) : 0,
    nextStepIndex,
    lastCompletedStepIndex: completed.at(-1) ?? null,
    isComplete: totalSteps > 0 && completed.length === totalSteps,
  };
}

export function togglePreparationStep(stepCount: number, completedSteps: number[], stepIndex: number) {
  const progress = getPreparationProgress(stepCount, completedSteps);
  if (!Number.isInteger(stepIndex) || stepIndex < 0 || stepIndex >= progress.totalSteps) return progress.completedSteps;
  return progress.completedSteps.includes(stepIndex)
    ? progress.completedSteps.filter((index) => index !== stepIndex)
    : [...progress.completedSteps, stepIndex].sort((a, b) => a - b);
}
