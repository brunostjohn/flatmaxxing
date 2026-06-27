import { markTaskBranch } from "@/inkHelpers";
import { runWithKicad } from "@/stages/kicad/outputs/runWithKicad";
import { kicadOutputTasks } from "@/stages/kicad/outputs/tasks";
import { kicadOutputTaskPaths } from "@/stages/kicad/outputs/taskPaths";
import type { KicadOutputContext } from "@/stages/kicad/outputs/types";
import { Effect, Match } from "effect";

const pasteSkipStatus = (context: KicadOutputContext): string =>
  context.options.stencil.generate
    ? (context.options.stencil.skipReason ?? "No enabled stencil sides.")
    : "stencil.generate=false";

const maskSkipStatus = (context: KicadOutputContext): string =>
  context.options.solderMask.generate
    ? (context.options.solderMask.skipReason ?? "No enabled solder mask sides.")
    : "solderMask.generate=false";

const generatePasteDxf = (context: KicadOutputContext) =>
  Match.value(
    context.options.stencil.generate && context.enabledPasteLayers.length > 0,
  ).pipe(
    Match.when(true, () =>
      context.tasks.runTask({
        path: kicadOutputTaskPaths.dxf.paste,
        effect: runWithKicad({
          context,
          args: [
            "pcb",
            "export",
            "dxf",
            "--layers",
            context.enabledPasteLayers,
            "--use-drill-origin",
            "--output-units",
            "mm",
            "--output",
            context.outputPaths.dxf,
          ],
          onOutput: (output) =>
            context.tasks.setTaskOutput(kicadOutputTaskPaths.dxf.paste, output),
        }),
        success: {
          label: "Successfully generated paste DXF files without edge cuts.",
        },
      }),
    ),
    Match.orElse(() =>
      markTaskBranch(
        context.tasks,
        kicadOutputTasks,
        kicadOutputTaskPaths.dxf.paste,
        {
          state: "success",
          label: "Paste DXF generation skipped.",
          status: pasteSkipStatus(context),
        },
      ),
    ),
  );

const generateMaskDxf = (context: KicadOutputContext) =>
  Match.value(context.shouldGenerateSolderMaskAssets).pipe(
    Match.when(true, () =>
      context.tasks.runTask({
        path: kicadOutputTaskPaths.dxf.mask,
        effect: runWithKicad({
          context,
          args: [
            "pcb",
            "export",
            "dxf",
            "--layers",
            context.enabledMaskLayers,
            "--common-layers",
            "Edge.Cuts",
            "--use-drill-origin",
            "--output-units",
            "mm",
            "--output",
            context.outputPaths.dxf,
          ],
          onOutput: (output) =>
            context.tasks.setTaskOutput(kicadOutputTaskPaths.dxf.mask, output),
        }),
        success: {
          label: "Successfully generated mask DXF files with edge cuts.",
        },
      }),
    ),
    Match.orElse(() =>
      markTaskBranch(
        context.tasks,
        kicadOutputTasks,
        kicadOutputTaskPaths.dxf.mask,
        {
          state: "success",
          label: "Mask DXF generation skipped.",
          status: maskSkipStatus(context),
        },
      ),
    ),
  );

export const generateDxf = (context: KicadOutputContext) =>
  Effect.all([generatePasteDxf(context), generateMaskDxf(context)], {
    concurrency: "unbounded",
  }).pipe(
    Effect.andThen(() =>
      context.tasks.patchTask(kicadOutputTaskPaths.dxf.root, {
        state: "success",
        label: "Successfully generated DXF files.",
        status: "",
      }),
    ),
    Effect.tapError((error) =>
      context.tasks.patchTask(kicadOutputTaskPaths.dxf.root, {
        state: "error",
        output: error instanceof Error ? error.message : String(error),
      }),
    ),
  );
