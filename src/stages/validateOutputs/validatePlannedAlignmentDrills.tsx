import { enabledSidesFromConfig, type ResolvedConfig } from "@/config";
import { renderWaiting } from "@/inkHelpers";
import {
  alignmentDrillPoints,
  renderAlignmentExcellon,
} from "@/stages/generateCncJobs/alignmentDrills";
import { findEdgeCutsBounds } from "@/stages/kicad/board";
import { Effect, FileSystem } from "effect";
import { basename, join } from "node:path";
import { parseKicadPcb } from "kicadts";

export type PlannedAlignmentDrillOptions = {
  readonly enabled: boolean;
  readonly gerbersDir: string;
  readonly distance: { readonly x: number; readonly y: number };
  readonly diameter: number;
};

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

export const plannedAlignmentDrillFile = (
  pcbFile: string,
  options: PlannedAlignmentDrillOptions,
) =>
  join(options.gerbersDir, `${basename(pcbFile, ".kicad_pcb")}-alignment.drl`);

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

export const writePlannedAlignmentDrillFile = Effect.fn(
  "flatmaxx.validate.writePlannedAlignmentDrillFile",
)(function* (pcbFile: string, options: PlannedAlignmentDrillOptions) {
  const [success, error] = yield* renderWaiting({
    loading: "Validating planned alignment drills...",
  });

  if (!options.enabled) {
    yield* success(
      "Planned alignment drill check skipped — alignment drills are not needed.",
    );
    return false;
  }

  const fs = yield* FileSystem.FileSystem;
  const outPath = plannedAlignmentDrillFile(pcbFile, options);
  const source = yield* fs.readFileString(pcbFile);

  const rendered = yield* Effect.try({
    try: () => renderPlannedAlignmentDrillFile(source, options),
    catch: (cause) =>
      cause instanceof Error ? cause : new Error(String(cause)),
  }).pipe(
    Effect.tapError((cause) =>
      error(
        cause instanceof Error
          ? cause.message
          : "Failed to derive planned alignment drills.",
      ),
    ),
  );

  yield* fs.makeDirectory(options.gerbersDir, { recursive: true });
  yield* fs.writeFileString(outPath, rendered);
  yield* success(`Planned alignment drill file written: ${outPath}`);
  return true;
});
