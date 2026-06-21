import { createTasklist } from "@/inkHelpers";
import { Effect, FileSystem } from "effect";
import { resolve } from "node:path";
import { xToolTaskPaths, xToolTasks } from "../tasks";
import { createSolderMaskProject } from "./createSolderMaskProject";
import { createSolderPasteStencilProjects } from "./createSolderPasteStencilProjects";
import { startXToolStudioLifecycle } from "./startXToolStudioLifecycle";

export const createXtoolProjects = Effect.fn("flatmaxx.createXtoolProjects")(
  function* (
    projectPath: string,
    pcbName: string,
    offsetSecondToTheRightBy: number,
    offsetBackToTheBottomBy: number,
  ) {
    const fs = yield* FileSystem.FileSystem;
    const tasks = yield* createTasklist(
      xToolTasks,
      "Step 2: Create xTool projects",
    );
    const xtoolProjectPath = resolve(projectPath, "xtool");

    yield* startXToolStudioLifecycle(tasks).pipe(
      Effect.tapError((error) =>
        tasks.patchTask(xToolTaskPaths.lifecycle.root, {
          state: "error",
          label: "Failed to prepare xTool Studio.",
          output: error instanceof Error ? error.message : String(error),
        }),
      ),
    );

    if (!(yield* fs.exists(xtoolProjectPath))) {
      yield* tasks.runTask({
        path: xToolTaskPaths.outputFolder,
        effect: fs.makeDirectory(xtoolProjectPath, { recursive: true }),
        loading: { status: `Creating ${xtoolProjectPath}...` },
        success: { label: "xTool folder created." },
        error: { label: "Failed to create xTool folder." },
      });
    } else {
      yield* tasks.patchTask(xToolTaskPaths.outputFolder, {
        state: "success",
        label: "xTool folder already exists.",
      });
    }

    yield* createSolderMaskProject(
      xtoolProjectPath,
      pcbName,
      tasks,
      offsetSecondToTheRightBy,
      offsetBackToTheBottomBy,
    ).pipe(
      Effect.tapError((error) =>
        tasks.patchTask(xToolTaskPaths.project, {
          state: "error",
          label: "Failed to create solder mask project.",
          output: error instanceof Error ? error.message : String(error),
        }),
      ),
    );

    yield* createSolderPasteStencilProjects(
      xtoolProjectPath,
      pcbName,
      tasks,
    ).pipe(
      Effect.tapError((error) =>
        tasks.patchTask(xToolTaskPaths.pasteStencils.root, {
          state: "error",
          label: "Failed to create solder paste stencil projects.",
          output: error instanceof Error ? error.message : String(error),
        }),
      ),
    );
  },
  Effect.scoped,
);
