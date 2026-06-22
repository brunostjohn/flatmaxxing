/**
 * Gap-free step numbering for the pipeline's user-facing stages.
 *
 * Stages call `nextStep()` only where they actually render a numbered step, so a
 * skipped stage consumes no number — the visible steps stay contiguous instead
 * of jumping (e.g. "Step 1 … Step 4" when the middle stages are skipped). The
 * CLI runs the pipeline once per process; `resetSteps()` keeps re-entry tidy.
 */
let current = 0;

export const nextStep = (): number => {
  current += 1;
  return current;
};

export const resetSteps = (): void => {
  current = 0;
};
