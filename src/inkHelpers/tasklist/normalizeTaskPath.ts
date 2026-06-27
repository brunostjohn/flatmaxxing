import type { TaskPath, TaskPathInput } from "./types";

export const normalizeTaskPath = (path: TaskPathInput): TaskPath =>
  typeof path === "string" ? [path] : path;
