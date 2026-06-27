import { Effect } from "effect";
import { RenderError } from "@/errors";
import { normalizeTaskPath } from "./normalizeTaskPath";
import type {
  BranchPatch,
  TaskDef,
  TasklistControls,
  TaskPath,
  TaskPathInput,
} from "./types";

const findTask = (
  tasks: readonly TaskDef[],
  path: readonly string[],
): TaskDef | undefined => {
  const [id, ...rest] = path;
  const task = tasks.find((candidate) => candidate.id === id);

  if (!task || rest.length === 0) {
    return task;
  }

  return findTask(task.children ?? [], rest);
};

const childPatch = (child: TaskDef, patch: BranchPatch): BranchPatch => ({
  state: patch.state,
  label: patch.state === "success" ? `${child.label} skipped.` : child.label,
  status: patch.childStatus ?? patch.status,
});

const patchBranch = (
  controls: TasklistControls,
  path: TaskPath,
  task: TaskDef,
  patch: BranchPatch,
): Effect.Effect<void> =>
  Effect.gen(function* () {
    yield* controls.patchTask(path, patch);

    yield* Effect.forEach(task.children ?? [], (child) =>
      patchBranch(
        controls,
        [...path, child.id] as TaskPath,
        child,
        childPatch(child, patch),
      ),
    );
  });

export const markTaskBranch = Effect.fn("flatmaxx.tasklist.markTaskBranch")(
  function* (
    controls: TasklistControls,
    allTasks: readonly TaskDef[],
    path: TaskPathInput,
    patch: BranchPatch,
  ) {
    const normalizedPath = normalizeTaskPath(path);
    const task = findTask(allTasks, normalizedPath);

    if (!task) {
      return yield* Effect.fail(
        new RenderError({
          message: `Task path not found: ${normalizedPath.join("/")}`,
        }),
      );
    }

    yield* patchBranch(controls, normalizedPath, task, patch);
  },
);

export const markTaskBranchSkipped = (
  controls: TasklistControls,
  allTasks: readonly TaskDef[],
  path: TaskPathInput,
  status: string,
) =>
  markTaskBranch(controls, allTasks, path, {
    state: "success",
    label: "Skipped.",
    status,
    childStatus: status,
  });
