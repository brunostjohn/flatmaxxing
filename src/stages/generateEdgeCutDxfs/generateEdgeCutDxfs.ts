import { renderDxfOutline } from "@/geometry/dxfWriter";
import { EdgeCutsError } from "@/errors";
import {
  createTasklist,
  markTaskBranch,
  nextStep,
  type TaskDef,
} from "@/inkHelpers";
import { findEdgeCutsBounds } from "@/stages/kicad/board/kicadBoardBounds";
import { Effect, FileSystem, Path } from "effect";
import { parseKicadPcb } from "kicadts";
import {
  collectEdgeCutsPrimitives,
  kicadToDxfTransform,
  transformOutline,
} from "./extractEdgeCutsOutline";
import {
  buildPlatingRoundedRect,
  resolvePlatingAlignmentPoints,
} from "./platingOutline";
import type { EdgeCutDxfOptions } from "./types";

export type { EdgeCutDxfOptions } from "./types";

interface BuiltDxfs {
  readonly platingDxf: string;
  readonly finalDxf: string;
}

const edgeCutTasks: TaskDef[] = [
  { id: "parse", label: "Parsing board outline...", state: "loading" },
  { id: "plating", label: "Plating outline DXF...", state: "pending" },
  { id: "final", label: "Final outline DXF...", state: "pending" },
];

export const edgeCutAlignmentPoints = (
  bounds: {
    readonly minX: number;
    readonly minY: number;
    readonly maxX: number;
    readonly maxY: number;
  },
  options: Pick<
    EdgeCutDxfOptions,
    "alignmentDistance" | "includeAlignmentDrills"
  >,
) => resolvePlatingAlignmentPoints(bounds, options);

const buildEdgeCutDxfs = (
  source: string,
  options: EdgeCutDxfOptions,
): BuiltDxfs => {
  const pcb = parseKicadPcb(source);
  const toDxf = kicadToDxfTransform(pcb);

  const finalOutline = transformOutline(collectEdgeCutsPrimitives(pcb), toDxf);

  const bounds = findEdgeCutsBounds(pcb);
  const alignment = edgeCutAlignmentPoints(bounds, options);
  const platingOutline = transformOutline(
    buildPlatingRoundedRect(
      bounds,
      alignment,
      options.platingOffsets,
      options.cornerRadius,
    ),
    toDxf,
  );

  return {
    platingDxf: renderDxfOutline(platingOutline.start, platingOutline.cmds),
    finalDxf: renderDxfOutline(finalOutline.start, finalOutline.cmds),
  };
};

const toEdgeCutsError = (cause: unknown) =>
  cause instanceof EdgeCutsError
    ? cause
    : new EdgeCutsError({
        message: cause instanceof Error ? cause.message : String(cause),
        cause,
      });

export const generateEdgeCutDxfs = Effect.fn("flatmaxx.generateEdgeCutDxfs")(
  function* (pcbFile: string, options: EdgeCutDxfOptions) {
    const title = options.enabled
      ? `Step ${nextStep()}: Generate edge-cut DXFs`
      : "Generate edge-cut DXFs (skipped)";
    const controls = yield* createTasklist(edgeCutTasks, title);

    if (!options.enabled) {
      yield* markTaskBranch(controls, edgeCutTasks, "parse", {
        state: "success",
        label: "Edge-cut DXF generation disabled — skipping.",
      });
      yield* markTaskBranch(controls, edgeCutTasks, "plating", {
        state: "success",
        label: "Plating outline skipped.",
      });
      yield* markTaskBranch(controls, edgeCutTasks, "final", {
        state: "success",
        label: "Final outline skipped.",
      });
      return;
    }

    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const board = path.basename(pcbFile, ".kicad_pcb");

    const built = yield* controls.runTask({
      path: "parse",
      effect: fs.readFileString(pcbFile).pipe(
        Effect.mapError(
          (cause) =>
            new EdgeCutsError({
              message: "Could not read the PCB file.",
              cause,
            }),
        ),
        Effect.flatMap((source) =>
          Effect.try({
            try: () => buildEdgeCutDxfs(source, options),
            catch: toEdgeCutsError,
          }),
        ),
      ),
      success: { label: "Parsed board outline." },
    });

    yield* fs.makeDirectory(options.gerbersDir, { recursive: true });
    const platingPath = path.join(
      options.gerbersDir,
      `${board}-PTH_EdgeCuts.dxf`,
    );
    const finalPath = path.join(
      options.gerbersDir,
      `${board}-Final_EdgeCuts.dxf`,
    );

    yield* controls.runTask({
      path: "plating",
      effect: fs.writeFileString(platingPath, built.platingDxf).pipe(
        Effect.mapError(
          (cause) =>
            new EdgeCutsError({
              message: "Could not write the plating DXF.",
              cause,
            }),
        ),
      ),
      success: { label: `Wrote ${path.basename(platingPath)}.` },
    });

    yield* controls.runTask({
      path: "final",
      effect: fs.writeFileString(finalPath, built.finalDxf).pipe(
        Effect.mapError(
          (cause) =>
            new EdgeCutsError({
              message: "Could not write the final DXF.",
              cause,
            }),
        ),
      ),
      success: { label: `Wrote ${path.basename(finalPath)}.` },
    });
  },
  Effect.scoped,
);
