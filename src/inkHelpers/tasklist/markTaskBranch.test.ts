import { xToolTaskPaths, xToolTasks } from "@/stages/xtool/tasks";
import { expect, test } from "bun:test";
import { Effect } from "effect";
import { markTaskBranch } from "./markTaskBranch";
import type {
  TasklistControls,
  TaskPathInput,
  TaskPatch,
  TaskState,
} from "./types";

test("recursively marks nested branches including restore modal leaves", async () => {
  const patches: Array<{ path: TaskPathInput; patch: TaskPatch }> = [];
  const controls: TasklistControls = {
    patchTask: (path, patch) =>
      Effect.sync(() => {
        patches.push({ path, patch });
      }),
    setTaskState: (path: TaskPathInput, state: TaskState) =>
      Effect.sync(() => {
        patches.push({ path, patch: { state } });
      }),
    setTaskOutput: (path, output) =>
      Effect.sync(() => {
        patches.push({ path, patch: { output } });
      }),
    setTaskStatus: (path, status) =>
      Effect.sync(() => {
        patches.push({ path, patch: { status } });
      }),
    runTask: ({ effect }) => effect,
    scope: () => controls,
  };

  await markTaskBranch(controls, xToolTasks, xToolTaskPaths.lifecycle.root, {
    state: "success",
    label: "xTool skipped.",
    status: "disabled",
    childStatus: "disabled",
  }).pipe(Effect.runPromise);

  expect(patches.map(({ path }) => path)).toContainEqual(
    xToolTaskPaths.lifecycle.discardRestoreModal,
  );
  expect(
    patches.find(
      ({ path }) =>
        Array.isArray(path) &&
        path.join("/") ===
          xToolTaskPaths.lifecycle.discardRestoreModal.join("/"),
    )?.patch,
  ).toMatchObject({
    state: "success",
    status: "disabled",
  });
});
