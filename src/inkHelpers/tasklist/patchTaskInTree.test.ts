import { expect, test } from "bun:test";
import { patchTaskInTree } from "./patchTaskInTree";
import { taskShouldExpand } from "./taskShouldExpand";
import type { TaskDef } from "./types";

const tasks: TaskDef[] = [
  {
    id: "root",
    label: "Root",
    state: "pending",
    children: [
      {
        id: "child",
        label: "Child",
        state: "pending",
        children: [
          {
            id: "leaf",
            label: "Leaf",
            state: "pending",
          },
        ],
      },
    ],
  },
];

test("patches a deeply nested task by path", () => {
  const nextTasks = patchTaskInTree(tasks, ["root", "child", "leaf"], {
    state: "loading",
    status: "Doing the thing",
  });

  expect(nextTasks[0]?.children?.[0]?.children?.[0]).toMatchObject({
    id: "leaf",
    state: "loading",
    status: "Doing the thing",
  });
});

test("leaves the original task tree untouched", () => {
  patchTaskInTree(tasks, ["root", "child"], { state: "success" });

  expect(tasks[0]?.children?.[0]?.state).toBe("pending");
});

test("expands ancestors of active or failed tasks", () => {
  const [root] = patchTaskInTree(tasks, ["root", "child", "leaf"], {
    state: "error",
  });

  expect(root).toBeDefined();
  expect(taskShouldExpand(root!)).toBe(true);
});

test("expands ancestors of warning tasks", () => {
  const [root] = patchTaskInTree(tasks, ["root", "child", "leaf"], {
    state: "warning",
  });

  expect(root).toBeDefined();
  expect(taskShouldExpand(root!)).toBe(true);
});
