const plannedAlignmentDrills = ["planned-alignment-drills"] as const;

export const plannedAlignmentDrillTaskPaths = {
  root: plannedAlignmentDrills,
  readBoard: [...plannedAlignmentDrills, "read-board"] as const,
  deriveDrills: [...plannedAlignmentDrills, "derive-drills"] as const,
  writeFile: [...plannedAlignmentDrills, "write-file"] as const,
} as const;
