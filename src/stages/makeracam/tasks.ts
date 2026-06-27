import type { TaskDef, TaskPath } from "@/inkHelpers";
import type { PlannedToolpath } from "./types";

export const toolpathTaskId = (index: number) => `toolpath-${index}`;

const toolpathTask = (toolpath: PlannedToolpath, index: number): TaskDef => ({
  id: toolpathTaskId(index),
  label: `Build toolpath: ${toolpath.file}`,
  state: "pending",
  children: [
    { id: "import", label: "Import 2D layer", state: "pending" },
    { id: "select-graphics", label: "Select layer graphics", state: "pending" },
    { id: "open-toolpath", label: "Open toolpath dialog", state: "pending" },
    { id: "set-depth", label: "Set end depth", state: "pending" },
    { id: "choose-tool", label: "Choose tool", state: "pending" },
    { id: "calculate", label: "Calculate path", state: "pending" },
    { id: "close-dialog", label: "Close toolpath dialog", state: "pending" },
  ],
});

export const buildMakeracamTasks = (
  planned: readonly PlannedToolpath[],
): TaskDef[] => [
  {
    id: "session",
    label: "Own MakeraCAM process",
    state: "pending",
    children: [
      { id: "new-project", label: "Create 3-axis project", state: "pending" },
      { id: "set-stock", label: "Set stock material to PCB", state: "pending" },
    ],
  },
  {
    id: "toolpaths",
    label: "Build toolpaths",
    state: "pending",
    children: planned.map(toolpathTask),
  },
  {
    id: "finalize",
    label: "Finalize and export",
    state: "pending",
    children: [
      {
        id: "reorder",
        label: "Reorder edge-cut contour to last",
        state: "pending",
      },
      { id: "save-paths", label: "Open Export ToolPaths", state: "pending" },
      {
        id: "assert-rows",
        label: "Verify exported path count",
        state: "pending",
      },
      { id: "tool-numbers", label: "Assign tool numbers", state: "pending" },
      { id: "export-gcode", label: "Export G-code", state: "pending" },
      { id: "save-mkc", label: "Save MakeraCAM project", state: "pending" },
    ],
  },
];

const session = ["session"] as const;
const toolpaths = ["toolpaths"] as const;
const finalize = ["finalize"] as const;

export const makeracamTaskPaths = {
  session: {
    root: session,
    newProject: [...session, "new-project"] as const,
    setStock: [...session, "set-stock"] as const,
  },
  toolpaths: {
    root: toolpaths,
    step: (index: number) =>
      ({
        root: [...toolpaths, toolpathTaskId(index)] as TaskPath,
        import: [...toolpaths, toolpathTaskId(index), "import"] as TaskPath,
        selectGraphics: [
          ...toolpaths,
          toolpathTaskId(index),
          "select-graphics",
        ] as TaskPath,
        openToolpath: [
          ...toolpaths,
          toolpathTaskId(index),
          "open-toolpath",
        ] as TaskPath,
        setDepth: [
          ...toolpaths,
          toolpathTaskId(index),
          "set-depth",
        ] as TaskPath,
        chooseTool: [
          ...toolpaths,
          toolpathTaskId(index),
          "choose-tool",
        ] as TaskPath,
        calculate: [
          ...toolpaths,
          toolpathTaskId(index),
          "calculate",
        ] as TaskPath,
        closeDialog: [
          ...toolpaths,
          toolpathTaskId(index),
          "close-dialog",
        ] as TaskPath,
      }) as const,
  },
  finalize: {
    root: finalize,
    reorder: [...finalize, "reorder"] as const,
    savePaths: [...finalize, "save-paths"] as const,
    assertRows: [...finalize, "assert-rows"] as const,
    toolNumbers: [...finalize, "tool-numbers"] as const,
    exportGcode: [...finalize, "export-gcode"] as const,
    saveMkc: [...finalize, "save-mkc"] as const,
  },
} as const;
