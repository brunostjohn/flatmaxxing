import type { TaskPath, TaskPathInput } from "./types";

export function normalizeTaskPath(path: TaskPathInput): TaskPath {
  return typeof path === "string" ? [path] : path;
}
