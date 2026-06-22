import type {
  SolderPasteStencilOptions,
  XToolLifecycleOptions,
} from "@/config";
import { markTaskBranch } from "@/inkHelpers";
import { Effect } from "effect";
import { xToolTaskPaths, xToolTasks } from "../tasks";
import { createSolderPasteStencilProject } from "./createSolderPasteStencilProject";
import type { XToolTasks } from "./types";

const defaultSolderPasteStencilOptions: SolderPasteStencilOptions = {
  enabled: true,
  sides: ["front", "back"],
  sideSkipStatus: {},
  xtool: {
    device: "F1 Ultra",
    power: 100,
    speed: 6000,
    passes: 3,
  },
};

export const createSolderPasteStencilProjects = Effect.fn(
  "flatmaxx.xtool.createSolderPasteStencilProjects",
)(function* (
  desiredAbsolutePath: string,
  pcbName: string,
  tasks: XToolTasks,
  options: SolderPasteStencilOptions = defaultSolderPasteStencilOptions,
  lifecycleOptions?: XToolLifecycleOptions,
) {
  if (!options.enabled) {
    const status = options.skipReason ?? "stencil.generate=false";
    yield* markTaskBranch(
      tasks,
      xToolTasks,
      xToolTaskPaths.pasteStencils.root,
      {
        state: "success",
        label: "Solder paste stencil projects skipped.",
        status,
        childStatus: status,
      },
    );
    return;
  }

  yield* tasks.patchTask(xToolTaskPaths.pasteStencils.root, {
    state: "loading",
    status: "Creating front and back solder paste stencil projects...",
  });

  if (options.sides.includes("front")) {
    yield* createSolderPasteStencilProject(
      desiredAbsolutePath,
      pcbName,
      "front",
      tasks,
      options.xtool,
      lifecycleOptions,
    ).pipe(
      Effect.tapError((error) =>
        tasks.patchTask(xToolTaskPaths.pasteStencils.front.root, {
          state: "error",
          label: "Failed to create front solder paste stencil.",
          output: error instanceof Error ? error.message : String(error),
        }),
      ),
    );
  } else {
    const status =
      options.sideSkipStatus.front ?? "front solder paste stencil excluded";
    yield* markTaskBranch(
      tasks,
      xToolTasks,
      xToolTaskPaths.pasteStencils.front.root,
      {
        state: "success",
        label: "Front solder paste stencil skipped.",
        status,
        childStatus: status,
      },
    );
  }

  if (options.sides.includes("back")) {
    yield* createSolderPasteStencilProject(
      desiredAbsolutePath,
      pcbName,
      "back",
      tasks,
      options.xtool,
      lifecycleOptions,
    ).pipe(
      Effect.tapError((error) =>
        tasks.patchTask(xToolTaskPaths.pasteStencils.back.root, {
          state: "error",
          label: "Failed to create back solder paste stencil.",
          output: error instanceof Error ? error.message : String(error),
        }),
      ),
    );
  } else {
    const status =
      options.sideSkipStatus.back ?? "back solder paste stencil excluded";
    yield* markTaskBranch(
      tasks,
      xToolTasks,
      xToolTaskPaths.pasteStencils.back.root,
      {
        state: "success",
        label: "Back solder paste stencil skipped.",
        status,
        childStatus: status,
      },
    );
  }

  yield* tasks.patchTask(xToolTaskPaths.pasteStencils.root, {
    state: "success",
    label: "Solder paste stencil projects handled.",
    status: "",
  });
});
