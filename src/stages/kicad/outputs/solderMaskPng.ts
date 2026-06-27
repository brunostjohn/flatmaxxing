import { markTaskBranch } from "@/inkHelpers";
import { generatePngFromSvg } from "@/stages/kicad/outputs/generatePngFromSvg";
import {
  sideConfig,
  solderMaskPngZoom,
} from "@/stages/kicad/outputs/constants";
import { kicadOutputTasks } from "@/stages/kicad/outputs/tasks";
import { kicadOutputTaskPaths } from "@/stages/kicad/outputs/taskPaths";
import {
  type KicadOutputContext,
  sideSkipStatus,
} from "@/stages/kicad/outputs/types";
import type { Side } from "@/config";
import { Effect, FileSystem, type Latch, Match, Path } from "effect";

const SIDES = ["front", "back"] as const;

const skipStatus = (context: KicadOutputContext): string =>
  context.options.solderMask.generate
    ? (context.options.solderMask.skipReason ?? "No enabled solder mask sides.")
    : "solderMask.generate=false";

const generateSidePng = (context: KicadOutputContext, side: Side) =>
  Effect.gen(function* () {
    const path = yield* Path.Path;
    const config = sideConfig[side];

    if (!context.options.solderMask.sides.includes(side)) {
      return yield* markTaskBranch(
        context.tasks,
        kicadOutputTasks,
        kicadOutputTaskPaths.png[side],
        {
          state: "success",
          label: `${config.label} PNG generation skipped.`,
          status: sideSkipStatus(context.options.sides, side, "solderMask"),
        },
      );
    }

    yield* context.tasks.runTask({
      path: kicadOutputTaskPaths.png[side],
      effect: generatePngFromSvg(
        path.resolve(
          context.outputPaths.svg,
          `${context.boardFilename}-${config.maskFileSuffix}.svg`,
        ),
        path.resolve(
          context.outputPaths.png,
          `${context.boardFilename}-${config.maskFileSuffix}.png`,
        ),
        { zoom: solderMaskPngZoom },
      ),
      success: { label: `Successfully generated ${config.label} PNG file.` },
    });
  });

export const generateSolderMaskPng = (
  context: KicadOutputContext,
  latch: Latch.Latch,
) =>
  Match.value(context.shouldGenerateSolderMaskAssets).pipe(
    Match.when(true, () =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;

        yield* fs.makeDirectory(context.outputPaths.png, { recursive: true });
        yield* latch.await;

        yield* context.tasks.patchTask(kicadOutputTaskPaths.png.root, {
          state: "loading",
          label: "Generating PNG files...",
        });

        yield* Effect.all(
          SIDES.map((side) => generateSidePng(context, side)),
          { concurrency: "unbounded" },
        ).pipe(
          Effect.tapError(() =>
            context.tasks.patchTask(kicadOutputTaskPaths.png.root, {
              state: "error",
              label: "Failed to generate PNG files.",
            }),
          ),
        );

        yield* context.tasks.patchTask(kicadOutputTaskPaths.png.root, {
          state: "success",
          label: "Successfully generated PNG files.",
        });
      }),
    ),
    Match.orElse(() =>
      markTaskBranch(
        context.tasks,
        kicadOutputTasks,
        kicadOutputTaskPaths.png.root,
        {
          state: "success",
          label: "Solder mask PNG generation skipped.",
          status: skipStatus(context),
        },
      ),
    ),
  );
