import type { SolderMaskProjectOptions, XToolLifecycleOptions } from "@/config";
import { markTaskBranch } from "@/inkHelpers";
import { Effect } from "effect";
import { xToolTaskPaths, xToolTasks } from "../tasks";
import { configureDeviceForSolderMask } from "./configureDeviceForSolderMask";
import { configureSettingsForSolderMask } from "./configureSettingsForSolderMask";
import { createNewXtoolProject } from "./createNewXtoolProject";
import { importBackSolderMask } from "./importBackSolderMask";
import { importFrontSolderMask } from "./importFrontSolderMask";
import { saveXtoolProjectAndClose } from "./saveXtoolProjectAndClose";
import type { XToolTasks } from "./types";

const defaultSolderMaskProjectOptions: SolderMaskProjectOptions = {
  enabled: true,
  sides: ["front", "back"],
  sideSkipStatus: {},
  double: true,
  distance: { x: 10, y: 10 },
  xtool: {
    device: "M1 Ultra",
    intensity: 100,
    passes: 3,
  },
};

export const createSolderMaskProject = Effect.fn(
  "flatmaxx.xtool.createSolderMaskProject",
)(function* (
  desiredAbsolutePath: string,
  pcbName: string,
  tasks: XToolTasks,
  options: SolderMaskProjectOptions = defaultSolderMaskProjectOptions,
  lifecycleOptions?: XToolLifecycleOptions,
) {
  if (!options.enabled) {
    const status = options.skipReason ?? "solderMask.generate=false";
    yield* markTaskBranch(tasks, xToolTasks, xToolTaskPaths.project, {
      state: "success",
      label: "Solder mask project skipped.",
      status,
      childStatus: status,
    });
    return;
  }

  yield* tasks.patchTask(xToolTaskPaths.project, {
    state: "loading",
    status: "Creating and configuring solder mask project...",
  });

  const newProjectTarget = yield* createNewXtoolProject(
    tasks,
    xToolTaskPaths.cdp,
    lifecycleOptions,
  );

  yield* configureDeviceForSolderMask(
    newProjectTarget,
    tasks,
    lifecycleOptions,
  );

  if (options.sides.includes("front")) {
    yield* importFrontSolderMask(
      desiredAbsolutePath,
      pcbName,
      newProjectTarget,
      tasks,
      options.distance.x,
      options.double,
    );
  } else {
    const status = options.sideSkipStatus.front ?? "front solder mask excluded";
    yield* markTaskBranch(tasks, xToolTasks, xToolTaskPaths.frontMask.root, {
      state: "success",
      label: "Front solder mask skipped.",
      status,
      childStatus: status,
    });
  }

  if (options.sides.includes("back")) {
    yield* importBackSolderMask(
      desiredAbsolutePath,
      pcbName,
      newProjectTarget,
      tasks,
      options.distance.x,
      options.distance.y,
      options.double,
    );
  } else {
    const status = options.sideSkipStatus.back ?? "back solder mask excluded";
    yield* markTaskBranch(tasks, xToolTasks, xToolTaskPaths.backMask.root, {
      state: "success",
      label: "Back solder mask skipped.",
      status,
      childStatus: status,
    });
  }

  yield* configureSettingsForSolderMask(
    { Runtime: newProjectTarget.Runtime, Input: newProjectTarget.Input },
    tasks,
    options.xtool,
  );

  yield* saveXtoolProjectAndClose(
    desiredAbsolutePath,
    `${pcbName}-solderMask.xs`,
    newProjectTarget,
    tasks,
  );

  yield* tasks.patchTask(xToolTaskPaths.project, {
    state: "success",
    label: "Solder mask project created.",
    status: "",
  });
});
