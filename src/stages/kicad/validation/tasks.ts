import type { TaskDef } from "@/inkHelpers";

export const validateBoardTasks: TaskDef[] = [
  {
    id: "validate-board",
    label: "Validating KiCAD board",
    state: "pending",
    children: [
      {
        id: "parse",
        label: "Parse KiCAD PCB file",
        state: "pending",
      },
      {
        id: "validate",
        label: "Run board validators",
        state: "pending",
      },
      {
        id: "apply-fixes",
        label: "Apply board fixes",
        state: "pending",
      },
    ],
  },
];
