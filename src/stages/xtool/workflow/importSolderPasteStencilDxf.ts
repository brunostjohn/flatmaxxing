import type { Client } from "chrome-remote-interface";
import { Effect } from "effect";
import { importDxfIntoXToolStudio } from "./importDxfIntoXToolStudio";
import { getSolderPasteStencilDxfPath } from "./getSolderPasteStencilDxfPath";
import { solderPasteStencilSideConfig } from "./solderPasteStencilSideConfig";
import type { SolderPasteStencilSide, XToolTasks } from "./types";

export const importSolderPasteStencilDxf = Effect.fn(
  "flatmaxx.xtool.importSolderPasteStencilDxf",
)(function* (
  projectPath: string,
  pcbName: string,
  side: SolderPasteStencilSide,
  newProjectTarget: Client,
  tasks: XToolTasks,
) {
  const config = solderPasteStencilSideConfig[side];
  const paths = config.taskPaths.importDxf;
  const dxfPath = getSolderPasteStencilDxfPath(projectPath, pcbName, side);

  yield* tasks.patchTask(paths.root, {
    state: "loading",
    status: `Preparing ${config.fileSuffix} DXF...`,
  });

  yield* importDxfIntoXToolStudio(
    dxfPath,
    { Runtime: newProjectTarget.Runtime, Input: newProjectTarget.Input },
    tasks,
    paths,
  );

  yield* tasks.patchTask(paths.root, {
    state: "success",
    label: `${config.label} paste DXF imported successfully.`,
    status: "",
  });
});
