import { renderDxfOutline } from "@/geometry/dxfWriter";
import { nextStep, renderWaiting } from "@/inkHelpers";
import { findEdgeCutsBounds } from "@/stages/boardValidation/kicadBoardBounds";
import { alignmentDrillPoints } from "@/stages/generateCncJobs/alignmentDrills";
import { Effect, FileSystem } from "effect";
import { parseKicadPcb } from "kicadts";
import { basename, join } from "node:path";
import {
  collectEdgeCutsPrimitives,
  kicadToDxfTransform,
  transformOutline,
} from "./extractEdgeCutsOutline";
import { buildPlatingRoundedRect, type PlatingOffsets } from "./platingOutline";

export interface EdgeCutDxfOptions {
  readonly enabled: boolean;
  readonly platingOffsets: PlatingOffsets;
  readonly cornerRadius: number;
  readonly includeAlignmentDrills: boolean;
  readonly alignmentDistance: { readonly x: number; readonly y: number };
  readonly gerbersDir: string;
}

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
) =>
  options.includeAlignmentDrills
    ? alignmentDrillPoints(
        {
          xmin: bounds.minX,
          ymin: bounds.minY,
          xmax: bounds.maxX,
          ymax: bounds.maxY,
        },
        options.alignmentDistance,
      )
    : [];

export const generateEdgeCutDxfs = Effect.fn("flatmaxx.generateEdgeCutDxfs")(
  function* (pcbFile: string, options: EdgeCutDxfOptions) {
    if (!options.enabled) {
      const [success] = yield* renderWaiting({
        loading: "Edge-cut DXF generation...",
      });
      yield* success("Edge-cut DXF generation disabled — skipping.");
      return;
    }

    const fs = yield* FileSystem.FileSystem;
    const board = basename(pcbFile, ".kicad_pcb");

    const step = nextStep();
    const tag = (message: string) => `Step ${step}: ${message}`;
    const [success, error] = yield* renderWaiting({
      loading: tag("Generating edge-cut DXFs (plating + final outline)..."),
    });

    const source = yield* fs
      .readFileString(pcbFile)
      .pipe(
        Effect.tapError(() =>
          error(tag("Edge-cut DXFs failed: could not read the PCB file.")),
        ),
      );

    const built = yield* Effect.try({
      try: () => {
        const pcb = parseKicadPcb(source);
        const toDxf = kicadToDxfTransform(pcb);

        const finalOutline = transformOutline(
          collectEdgeCutsPrimitives(pcb),
          toDxf,
        );

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
          platingDxf: renderDxfOutline(
            platingOutline.start,
            platingOutline.cmds,
          ),
          finalDxf: renderDxfOutline(finalOutline.start, finalOutline.cmds),
        };
      },
      catch: (cause) =>
        cause instanceof Error ? cause : new Error(String(cause)),
    }).pipe(
      Effect.tapError((cause) =>
        error(tag(`Edge-cut DXFs failed: ${cause.message}`)),
      ),
    );

    yield* fs.makeDirectory(options.gerbersDir, { recursive: true });
    const platingPath = join(options.gerbersDir, `${board}-PTH_EdgeCuts.dxf`);
    const finalPath = join(options.gerbersDir, `${board}-Final_EdgeCuts.dxf`);

    yield* fs
      .writeFileString(platingPath, built.platingDxf)
      .pipe(
        Effect.tapError(() =>
          error(tag("Edge-cut DXFs failed: could not write the plating DXF.")),
        ),
      );
    yield* fs
      .writeFileString(finalPath, built.finalDxf)
      .pipe(
        Effect.tapError(() =>
          error(tag("Edge-cut DXFs failed: could not write the final DXF.")),
        ),
      );

    yield* success(
      tag(
        `Wrote ${basename(platingPath)} + ${basename(finalPath)} to ${basename(options.gerbersDir)}/.`,
      ),
    );
  },
);
