import { dxfFileHasPlottableGeometry } from "./dxfValidation";
import { getSolderPasteStencilDxfPath } from "./getSolderPasteStencilDxfPath";
import { solderPasteStencilSideConfig } from "./solderPasteStencilSideConfig";
import { Effect } from "effect";
import type { SolderPasteStencilSide, XToolTasks } from "./types";

export const validateSolderPasteStencilDxf = Effect.fn(
  "flatmaxx.xtool.validateSolderPasteStencilDxf",
)(function* (
  projectPath: string,
  pcbName: string,
  side: SolderPasteStencilSide,
  tasks: XToolTasks,
) {
  const config = solderPasteStencilSideConfig[side];
  const paths = config.taskPaths.importDxf;
  const dxfPath = getSolderPasteStencilDxfPath(projectPath, pcbName, side);

  yield* tasks.patchTask(paths.root, {
    state: "loading",
    status: `Checking ${config.fileSuffix} DXF before opening xTool...`,
  });

  const hasGeometry = yield* tasks.runTask({
    path: paths.validateDxf,
    // Runs the geometry check in a Bun worker (off the main thread).
    effect: dxfFileHasPlottableGeometry(dxfPath),
    loading: { status: `Validating ${dxfPath} has plottable geometry...` },
    success: { label: `${config.fileSuffix} DXF checked.` },
    error: { label: `Failed to validate ${config.fileSuffix} DXF.` },
  });

  if (!hasGeometry) {
    yield* tasks.patchTask(paths.validateDxf, {
      state: "success",
      label: `${config.fileSuffix} DXF has no plottable objects; skipping.`,
      status: "",
    });
    yield* tasks.patchTask(paths.root, {
      state: "success",
      label: `${config.label} paste DXF is empty; skipping stencil import.`,
      status: dxfPath,
    });
    return false;
  }

  yield* tasks.patchTask(paths.validateDxf, {
    state: "success",
    label: `${config.fileSuffix} DXF has plottable objects.`,
    status: "",
  });

  return true;
});
