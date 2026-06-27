import { enabledSidesFromConfig, type ResolvedConfig } from "@/config";
import { DrillError } from "@/errors";
import { createTasklist, markTaskBranch, nextStep } from "@/inkHelpers";
import {
  alignmentDrillPoints,
  renderAlignmentExcellon,
} from "@/stages/generateCncJobs/alignmentDrills";
import { findEdgeCutsBounds } from "@/stages/kicad/board";
import { Effect, FileSystem, Path } from "effect";
import { parseKicadPcb } from "kicadts";
import { plannedAlignmentDrillTasks } from "./plannedAlignmentDrillTasks";
import { plannedAlignmentDrillTaskPaths } from "./plannedAlignmentDrillTaskPaths";
import type { PlannedAlignmentDrillOptions } from "./types";

export const buildPlannedAlignmentDrillOptions = (
  config: ResolvedConfig,
): PlannedAlignmentDrillOptions => ({
  enabled:
    config.alignmentDrills.generate &&
    config.cnc.isolation.tool !== undefined &&
    enabledSidesFromConfig(config).includes("back"),
  gerbersDir: config.paths.gerbers,
  distance: config.alignmentDrills.distance,
  diameter: config.alignmentDrills.diameter,
});

export const plannedAlignmentDrillFile = Effect.fn(
  "flatmaxx.validate.plannedAlignmentDrillFile",
)(function* (pcbFile: string, options: PlannedAlignmentDrillOptions) {
  const path = yield* Path.Path;
  return path.join(
    options.gerbersDir,
    `${path.basename(pcbFile, ".kicad_pcb")}-alignment.drl`,
  );
});

export const renderPlannedAlignmentDrillFile = (
  source: string,
  options: PlannedAlignmentDrillOptions,
) => {
  const pcb = parseKicadPcb(source);
  const bounds = findEdgeCutsBounds(pcb);
  const points = alignmentDrillPoints(
    {
      xmin: bounds.minX,
      ymin: bounds.minY,
      xmax: bounds.maxX,
      ymax: bounds.maxY,
    },
    options.distance,
  );

  return renderAlignmentExcellon(points, options.diameter);
};

const deriveDrillFile = (
  source: string,
  options: PlannedAlignmentDrillOptions,
) =>
  Effect.try({
    try: () => renderPlannedAlignmentDrillFile(source, options),
    catch: (cause) =>
      new DrillError({
        message: "Failed to derive planned alignment drills.",
        cause,
      }),
  });

export const writePlannedAlignmentDrillFile = Effect.fn(
  "flatmaxx.validate.writePlannedAlignmentDrillFile",
)(function* (pcbFile: string, options: PlannedAlignmentDrillOptions) {
  const fs = yield* FileSystem.FileSystem;
  const title = options.enabled
    ? `Step ${nextStep()}: Validate planned alignment drills`
    : "Validate planned alignment drills (skipped)";
  const tasks = yield* createTasklist(plannedAlignmentDrillTasks, title);

  if (!options.enabled) {
    yield* markTaskBranch(
      tasks,
      plannedAlignmentDrillTasks,
      plannedAlignmentDrillTaskPaths.root,
      {
        state: "success",
        label: "Planned alignment drill check skipped.",
        status: "Alignment drills are not needed.",
        childStatus: "Alignment drills are not needed.",
      },
    );
    return false;
  }

  const outPath = yield* plannedAlignmentDrillFile(pcbFile, options);

  const source = yield* tasks.runTask({
    path: plannedAlignmentDrillTaskPaths.readBoard,
    effect: fs.readFileString(pcbFile),
    loading: { status: `Reading ${pcbFile}...` },
    success: { label: "KiCad board read." },
    error: { label: `Failed to read ${pcbFile}.` },
  });

  const rendered = yield* tasks.runTask({
    path: plannedAlignmentDrillTaskPaths.deriveDrills,
    effect: deriveDrillFile(source, options),
    loading: { status: "Deriving planned alignment drills..." },
    success: { label: "Planned alignment drills derived." },
    error: { label: "Failed to derive planned alignment drills." },
  });

  yield* tasks.runTask({
    path: plannedAlignmentDrillTaskPaths.writeFile,
    effect: fs
      .makeDirectory(options.gerbersDir, { recursive: true })
      .pipe(Effect.andThen(fs.writeFileString(outPath, rendered))),
    loading: { status: `Writing ${outPath}...` },
    success: { label: `Planned alignment drill file written: ${outPath}` },
    error: { label: `Failed to write ${outPath}.` },
  });

  return true;
});
