import { markTaskBranch } from "@/inkHelpers";
import { runWithKicad } from "@/stages/kicad/outputs/runWithKicad";
import { kicadOutputTasks } from "@/stages/kicad/outputs/tasks";
import { kicadOutputTaskPaths } from "@/stages/kicad/outputs/taskPaths";
import type { KicadOutputContext } from "@/stages/kicad/outputs/types";
import { Match } from "effect";

export const generateDrill = (context: KicadOutputContext) =>
  Match.value(context.options.drills.generate).pipe(
    Match.when(true, () =>
      context.tasks.runTask({
        path: kicadOutputTaskPaths.drill,
        effect: runWithKicad({
          context,
          args: [
            "pcb",
            "export",
            "drill",
            "--drill-origin",
            "plot",
            "--excellon-oval-format",
            "route",
            "--output",
            context.outputPaths.gerbers,
          ],
          onOutput: (output) =>
            context.tasks.setTaskOutput(kicadOutputTaskPaths.drill, output),
        }),
        loading: { label: "Generating drill files..." },
        success: {
          label: "Successfully generated drill files.",
          status: context.options.drills.withEdgeCuts
            ? "withEdgeCuts is enabled for downstream drill handling."
            : "",
        },
        error: { label: "Failed to generate drill files." },
      }),
    ),
    Match.orElse(() =>
      markTaskBranch(
        context.tasks,
        kicadOutputTasks,
        kicadOutputTaskPaths.drill,
        {
          state: "success",
          label: "Drill generation skipped.",
          status: "drills.generate=false",
        },
      ),
    ),
  );
