import type { TaskDef, TaskPatch, TaskPath } from "./types";
import { updateTaskInTree } from "./updateTaskInTree";

export const patchTaskInTree = (
  tasks: readonly TaskDef[],
  path: TaskPath,
  patch: TaskPatch,
) => updateTaskInTree(tasks, path, (task) => ({ ...task, ...patch }));
