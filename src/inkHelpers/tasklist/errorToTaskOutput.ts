export function errorToTaskOutput(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
