import type { TaskDef } from "@/inkHelpers";

export const ensureKicadTasks: TaskDef[] = [
  {
    id: "kicad-cli",
    label: "Checking if KiCAD exists...",
    state: "pending",
  },
];

export const findProjectTasks: TaskDef[] = [
  {
    id: "kicad-project",
    label: "Checking for KiCAD projects...",
    state: "pending",
  },
];
