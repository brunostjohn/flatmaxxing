import { markTaskBranch } from "@/inkHelpers";
import { runWithKicad } from "@/stages/kicad/outputs/runWithKicad";
import { kicadOutputTasks } from "@/stages/kicad/outputs/tasks";
import { kicadOutputTaskPaths } from "@/stages/kicad/outputs/taskPaths";
import type { KicadOutputContext } from "@/stages/kicad/outputs/types";
import { Effect, type Latch, Match } from "effect";

const skipStatus = (context: KicadOutputContext): string =>
  context.options.solderMask.generate
    ? (context.options.solderMask.skipReason ?? "No enabled solder mask sides.")
    : "solderMask.generate=false";

export const generateSolderMaskSvg = (
  context: KicadOutputContext,
  latch: Latch.Latch,
) =>
  Match.value(context.shouldGenerateSolderMaskAssets).pipe(
    Match.when(true, () =>
      context.tasks.runTask({
        path: kicadOutputTaskPaths.svg,
        effect: runWithKicad({
          context,
          args: [
            "pcb",
            "export",
            "svg",
            "--layers",
            context.enabledMaskLayers,
            "--common-layers",
            "Edge.Cuts",
            "--mode-multi",
            "--page-size-mode",
            "2",
            "--black-and-white",
            "--exclude-drawing-sheet",
            "--output",
            context.outputPaths.svg,
          ],
          onOutput: (output) =>
            context.tasks.setTaskOutput(kicadOutputTaskPaths.svg, output),
        }).pipe(Effect.tap(() => latch.open)),
        loading: { label: "Generating SVG files..." },
        success: { label: "Successfully generated SVG files." },
        error: { label: "Failed to generate SVG files." },
      }),
    ),
    Match.orElse(() =>
      markTaskBranch(
        context.tasks,
        kicadOutputTasks,
        kicadOutputTaskPaths.svg,
        {
          state: "success",
          label: "Solder mask SVG generation skipped.",
          status: skipStatus(context),
        },
      ).pipe(Effect.andThen(latch.open)),
    ),
  );
