const validate = ["validate-board"] as const;

export const validateBoardTaskPaths = {
  root: validate,
  parse: [...validate, "parse"] as const,
  validate: [...validate, "validate"] as const,
  applyFixes: [...validate, "apply-fixes"] as const,
} as const;
