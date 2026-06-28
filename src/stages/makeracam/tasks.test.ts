import type { TaskDef, TaskPath } from "@/inkHelpers";
import { patchTaskInTree } from "@/inkHelpers";
import { joinTaskPath } from "@/inkHelpers/tasklist/joinTaskPath";
import { expect, test } from "bun:test";
import type { PlannedToolpath } from "./types";
import { buildMakeracamTasks, makeracamTaskPaths } from "./tasks";

const planned: readonly PlannedToolpath[] = [
  {
    file: "edge.dxf",
    absPath: "/edge.dxf",
    kind: "contour",
    category: "edge",
    method: "contour",
    diameterMm: 0,
  },
];

const nodeAt = (tasks: readonly TaskDef[], path: TaskPath): TaskDef | undefined =>
  path.reduce<TaskDef | undefined>(
    (node, id, depth) =>
      depth === 0
        ? tasks.find((task) => task.id === id)
        : node?.children?.find((child) => child.id === id),
    undefined,
  );

test("patching a toolpath child by its absolute path updates that node", () => {
  const tree = buildMakeracamTasks(planned);
  const importPath = makeracamTaskPaths.toolpaths.step(0).import;

  expect(nodeAt(tree, importPath)?.state).toBe("pending");

  const patched = patchTaskInTree(tree, importPath, { state: "success" });

  expect(nodeAt(patched, importPath)?.state).toBe("success");
});

test("the old scoped path double-prefixes and matches nothing (regression)", () => {
  const tree = buildMakeracamTasks(planned);
  const step = makeracamTaskPaths.toolpaths.step(0);
  const buggyPath = joinTaskPath(step.root, step.import);

  const patched = patchTaskInTree(tree, buggyPath, { state: "success" });

  expect(nodeAt(patched, step.import)?.state).toBe("pending");
  expect(patched).toEqual(tree);
});
