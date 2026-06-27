import { markTaskBranch } from "@/inkHelpers";
import { runAppleScript } from "@/macos";
import type { Client } from "chrome-remote-interface";
import { Effect } from "effect";
import { applescriptCopyFileToClipboard } from "../scripts";
import { xToolTasks } from "../tasks";
import { getSolderMaskBounds } from "./getSolderMaskBounds";
import { pasteIntoXToolStudio } from "./pasteIntoXToolStudio";
import { getSolderMaskPngPath } from "./solderMaskAssetPaths";
import { solderMaskSideConfig } from "./solderMaskSideConfig";
import type {
  SolderMaskImportOptions,
  SolderMaskSide,
  XToolTasks,
} from "./types";

export const importSolderMask = Effect.fn("flatmaxx.xtool.importSolderMask")(
  function* (
    projectPath: string,
    pcbName: string,
    side: SolderMaskSide,
    newProjectTarget: Client,
    tasks: XToolTasks,
    options: SolderMaskImportOptions,
  ) {
    const config = solderMaskSideConfig[side];
    const paths = config.taskPaths;

    yield* tasks.patchTask(paths.root, {
      state: "loading",
      status: `Preparing ${config.fileSuffix} assets...`,
    });

    const bounds = yield* getSolderMaskBounds(
      projectPath,
      pcbName,
      side,
      tasks,
    );

    const pngPath = yield* getSolderMaskPngPath(projectPath, pcbName, side);
    yield* tasks.runTask({
      path: paths.copyPng,
      effect: runAppleScript(applescriptCopyFileToClipboard(pngPath)),
      loading: { status: `Copying ${config.fileSuffix} PNG to clipboard...` },
      success: { label: `${config.fileSuffix} PNG copied to clipboard.` },
    });

    yield* pasteIntoXToolStudio(
      newProjectTarget,
      bounds,
      options.firstPasteOffsets,
      tasks,
      paths.pasteFirst,
    );

    if (options.pasteSecond) {
      yield* pasteIntoXToolStudio(
        newProjectTarget,
        bounds,
        options.secondPasteOffsets,
        tasks,
        paths.pasteSecond,
      );
    } else {
      yield* markTaskBranch(tasks, xToolTasks, paths.pasteSecond.root, {
        state: "success",
        label: `Second ${config.label} solder mask paste skipped.`,
        status: "solderMask.double=false",
        childStatus: "solderMask.double=false",
      });
    }

    yield* tasks.patchTask(paths.root, {
      state: "success",
      label: `${config.label} solder mask imported successfully.`,
      status: "",
    });
  },
);
