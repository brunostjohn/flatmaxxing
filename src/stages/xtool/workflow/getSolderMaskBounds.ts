import { dxfBounds } from "@/compute";
import { Effect, FileSystem } from "effect";
import { parseDxfString } from "./dxfValidation";
import { getSolderMaskDxfPath } from "./solderMaskAssetPaths";
import { solderMaskSideConfig } from "./solderMaskSideConfig";
import type { SolderMaskSide, XToolTasks } from "./types";

export const getSolderMaskBounds = Effect.fn(
  "flatmaxx.xtool.getSolderMaskBounds",
)(function* (
  projectPath: string,
  pcbName: string,
  side: SolderMaskSide,
  tasks: XToolTasks,
) {
  const fs = yield* FileSystem.FileSystem;
  const config = solderMaskSideConfig[side];
  const paths = config.taskPaths;
  const dxfPath = getSolderMaskDxfPath(projectPath, pcbName, side);

  const dxfFile = yield* tasks.runTask({
    path: paths.readDxf,
    effect: fs.readFileString(dxfPath),
    loading: { status: `Reading ${config.fileSuffix} DXF from disk...` },
    success: { label: `${config.fileSuffix} DXF read.` },
  });

  const dxf = yield* tasks.runTask({
    path: paths.parseDxf,
    effect: parseDxfString(dxfFile),
    loading: { status: `Parsing ${config.fileSuffix} DXF entities...` },
    success: { label: `${config.fileSuffix} DXF parsed.` },
    error: { status: `Failed to parse ${config.fileSuffix} DXF file.` },
  });

  return yield* tasks.runTask({
    path: paths.measureBounds,
    // Runs the bounds math (incl. spline Bézier extrema) in a Bun worker.
    effect: dxfBounds(dxf),
    loading: { status: `Measuring ${config.fileSuffix} geometry bounds...` },
    success: { label: `Measured ${config.label} solder mask bounds.` },
  });
});
