import type { TaskPath, TaskPathInput } from "./types";
import { normalizeTaskPath } from "./normalizeTaskPath";

export function joinTaskPath(base: TaskPath, path: TaskPathInput): TaskPath {
	return [...base, ...normalizeTaskPath(path)] as TaskPath;
}
