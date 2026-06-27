import type { TaskDef } from "@/inkHelpers";

export const plannedAlignmentDrillTasks: TaskDef[] = [
  {
    id: "planned-alignment-drills",
    label: "Validate planned alignment drills",
    state: "pending",
    children: [
      { id: "read-board", label: "Read KiCad board", state: "pending" },
      {
        id: "derive-drills",
        label: "Derive planned alignment drills",
        state: "pending",
      },
      {
        id: "write-file",
        label: "Write planned alignment drill file",
        state: "pending",
      },
    ],
  },
];
