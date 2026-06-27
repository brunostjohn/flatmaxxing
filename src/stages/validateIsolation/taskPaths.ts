const isolation = ["isolation-feasibility"] as const;

export const isolationTaskPaths = {
  root: isolation,
  compilePatterns: [...isolation, "compile-ignore-patterns"] as const,
  runDrc: [...isolation, "run-drc"] as const,
  evaluate: [...isolation, "evaluate-violations"] as const,
} as const;
