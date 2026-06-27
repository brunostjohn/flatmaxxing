import { runWithKicad } from "@/stages/kicad/outputs/runWithKicad";
import { kicadOutputTaskPaths } from "@/stages/kicad/outputs/taskPaths";
import type { KicadOutputContext } from "@/stages/kicad/outputs/types";

export const generateGerbers = (context: KicadOutputContext) =>
  context.tasks.runTask({
    path: kicadOutputTaskPaths.gerbers,
    effect: runWithKicad({
      context,
      args: [
        "pcb",
        "export",
        "gerbers",
        "--use-drill-file-origin",
        "--output",
        context.outputPaths.gerbers,
      ],
      onOutput: (output) =>
        context.tasks.setTaskOutput(kicadOutputTaskPaths.gerbers, output),
    }),
    loading: { label: "Generating Gerbers..." },
    success: { label: "Successfully generated Gerbers." },
    error: { label: "Failed to generate Gerbers." },
  });
