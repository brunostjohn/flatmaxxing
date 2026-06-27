import type { TaskDef } from "./types";

export const taskShouldExpand = (task: TaskDef): boolean =>
  task.children?.some(
    (child) =>
      child.state === "loading" ||
      child.state === "error" ||
      child.state === "warning" ||
      taskShouldExpand(child),
  ) ?? false;
