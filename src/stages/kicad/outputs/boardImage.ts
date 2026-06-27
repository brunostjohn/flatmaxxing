import { markTaskBranch } from "@/inkHelpers";
import {
  boardImageLayers,
  boardImagePngZoom,
} from "@/stages/kicad/outputs/constants";
import {
  getBoardImagePngPath,
  getBoardImageSvgPath,
} from "@/stages/kicad/outputs/boardImagePaths";
import {
  formatPngTrimStatus,
  generatePngFromSvg,
} from "@/stages/kicad/outputs/generatePngFromSvg";
import { runWithKicad } from "@/stages/kicad/outputs/runWithKicad";
import { kicadOutputTasks } from "@/stages/kicad/outputs/tasks";
import { kicadOutputTaskPaths } from "@/stages/kicad/outputs/taskPaths";
import type { KicadOutputContext } from "@/stages/kicad/outputs/types";
import { Effect, FileSystem, Match } from "effect";

export const buildBoardImageSvgExportArgs = (svgPath: string) => [
  "pcb",
  "export",
  "svg",
  "--layers",
  boardImageLayers,
  "--mode-single",
  "--page-size-mode",
  "2",
  "--exclude-drawing-sheet",
  "--output",
  svgPath,
];

export const generateBoardImage = (context: KicadOutputContext) =>
  Match.value(context.options.boardImage.generate).pipe(
    Match.when(true, () =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const svgPath = getBoardImageSvgPath(
          context.outputPaths.svg,
          context.boardFilename,
        );
        const pngPath = getBoardImagePngPath(
          context.outputPaths.png,
          context.boardFilename,
        );

        yield* fs.makeDirectory(context.outputPaths.png, { recursive: true });
        yield* context.tasks.patchTask(kicadOutputTaskPaths.boardImage.root, {
          state: "loading",
          label: "Generating board image...",
        });

        yield* context.tasks.runTask({
          path: kicadOutputTaskPaths.boardImage.svg,
          effect: runWithKicad({
            context,
            args: buildBoardImageSvgExportArgs(svgPath),
            onOutput: (output) =>
              context.tasks.setTaskOutput(
                kicadOutputTaskPaths.boardImage.svg,
                output,
              ),
          }),
          success: { label: "Successfully generated board image SVG." },
        });

        const png = yield* context.tasks.runTask({
          path: kicadOutputTaskPaths.boardImage.png,
          effect: generatePngFromSvg(svgPath, pngPath, {
            zoom: boardImagePngZoom,
          }),
          success: { label: "Successfully generated board image PNG." },
        });

        yield* context.tasks.patchTask(kicadOutputTaskPaths.boardImage.png, {
          status: formatPngTrimStatus(png.info),
        });
        yield* context.tasks.patchTask(kicadOutputTaskPaths.boardImage.root, {
          state: "success",
          label: "Successfully generated board image.",
          status: pngPath,
        });

        return pngPath;
      }).pipe(
        Effect.tapError((error) =>
          context.tasks.patchTask(kicadOutputTaskPaths.boardImage.root, {
            state: "error",
            output: error instanceof Error ? error.message : String(error),
          }),
        ),
      ),
    ),
    Match.orElse(() =>
      markTaskBranch(
        context.tasks,
        kicadOutputTasks,
        kicadOutputTaskPaths.boardImage.root,
        {
          state: "success",
          label: "Board image generation skipped.",
          status:
            context.options.boardImage.skipReason ?? "board image disabled.",
        },
      ).pipe(Effect.as(undefined)),
    ),
  );
