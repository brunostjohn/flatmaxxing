import { normalizeTaskPath } from "./normalizeTaskPath";
import type { TaskPath, TaskPathInput } from "./types";

export const joinTaskPath = (base: TaskPath, path: TaskPathInput): TaskPath =>
  [...base, ...normalizeTaskPath(path)] as TaskPath;
