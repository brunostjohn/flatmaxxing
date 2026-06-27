import type { Side } from "@/config";
import { markTaskBranch } from "@/inkHelpers";
import { sideConfig } from "@/stages/kicad/outputs/constants";
import { runWithKicad } from "@/stages/kicad/outputs/runWithKicad";
import { kicadOutputTasks } from "@/stages/kicad/outputs/tasks";
import { kicadOutputTaskPaths } from "@/stages/kicad/outputs/taskPaths";
import type { KicadOutputContext } from "@/stages/kicad/outputs/types";
import { Effect, FileSystem, Match, Path } from "effect";

const SIDES = ["front", "back"] as const;

const generateSidePlace = (context: KicadOutputContext, side: Side) =>
  Effect.gen(function* () {
    const path = yield* Path.Path;
    const config = sideConfig[side];

    if (!context.options.sides.includes(side)) {
      return yield* markTaskBranch(
        context.tasks,
        kicadOutputTasks,
        kicadOutputTaskPaths.place[side],
        {
          state: "success",
          label: `${config.label} place generation skipped.`,
          status: `board.ignoreSide=${side}`,
        },
      );
    }

    yield* context.tasks.runTask({
      path: kicadOutputTaskPaths.place[side],
      effect: runWithKicad({
        context,
        args: [
          "pcb",
          "export",
          "pos",
          "--side",
          config.placeSide,
          "--units",
          "mm",
          "--use-drill-file-origin",
          "--bottom-negate-x",
          "--output",
          path.resolve(
            context.outputPaths.place,
            `${context.boardFilename}_${config.placeSuffix}.pos`,
          ),
        ],
        onOutput: (output) =>
          context.tasks.setTaskOutput(kicadOutputTaskPaths.place.root, output),
      }),
      success: { label: `Successfully generated ${config.label} place file.` },
    });
  });

export const generatePlace = (context: KicadOutputContext) =>
  Match.value(context.options.place.generate).pipe(
    Match.when(true, () =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        yield* fs.makeDirectory(context.outputPaths.place, { recursive: true });

        yield* Effect.all(
          SIDES.map((side) => generateSidePlace(context, side)),
          { concurrency: "unbounded" },
        );
        yield* context.tasks.patchTask(kicadOutputTaskPaths.place.root, {
          state: "success",
          label: "Successfully generated place files.",
        });
      }),
    ),
    Match.orElse(() =>
      markTaskBranch(
        context.tasks,
        kicadOutputTasks,
        kicadOutputTaskPaths.place.root,
        {
          state: "success",
          label: "Place file generation skipped.",
          status: "place.generate=false",
        },
      ),
    ),
  );
