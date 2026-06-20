import type { TaskDef, TaskPatch, TaskPath } from "./types";
import { updateTaskInTree } from "./updateTaskInTree";

export function patchTaskInTree(
	tasks: readonly TaskDef[],
	path: TaskPath,
	patch: TaskPatch,
): TaskDef[] {
	return updateTaskInTree(tasks, path, (task) => ({ ...task, ...patch }));
}
