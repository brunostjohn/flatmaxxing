import type { TaskDef } from "@/inkHelpers";

export const isolationTasks: TaskDef[] = [
  {
    id: "isolation-feasibility",
    label: "Validate isolation feasibility",
    state: "pending",
    children: [
      {
        id: "compile-ignore-patterns",
        label: "Compile ignore patterns",
        state: "pending",
      },
      {
        id: "run-drc",
        label: "Run KiCad clearance DRC",
        state: "pending",
      },
      {
        id: "evaluate-violations",
        label: "Evaluate clearance violations",
        state: "pending",
      },
    ],
  },
];
