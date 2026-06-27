export const errorToTaskOutput = (error: unknown) =>
  error instanceof Error ? error.message : String(error);
