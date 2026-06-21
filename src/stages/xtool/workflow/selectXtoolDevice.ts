import { runAppleScript } from "@/utils";
import type { Client } from "chrome-remote-interface";
import { Duration, Effect, Schedule } from "effect";
import { runScriptInXToolStudio } from "../cdp";
import {
  applescriptSetWindowSize,
  clickConfirmSwitch,
  clickDeviceLibrary,
  clickDeviceSwitch,
} from "../scripts";
import type { DeviceSelectionTaskPaths, XToolTasks } from "./types";

export const selectXtoolDevice = Effect.fn("flatmaxx.xtool.selectDevice")(
  function* (
    newProjectTarget: Client,
    tasks: XToolTasks,
    paths: DeviceSelectionTaskPaths,
    deviceName: string,
    selectDeviceScript: string,
  ) {
    yield* tasks.patchTask(paths.root, {
      state: "loading",
      status: `Selecting ${deviceName}...`,
    });

    yield* tasks.runTask({
      path: paths.switchDevice,
      effect: runScriptInXToolStudio(
        clickDeviceSwitch,
        newProjectTarget.Runtime,
      ),
      loading: { status: "Clicking device switch..." },
      success: { label: "Device switcher opened." },
    });

    yield* tasks.runTask({
      path: paths.openDeviceLibrary,
      effect: runScriptInXToolStudio(
        clickDeviceLibrary,
        newProjectTarget.Runtime,
      ),
      loading: { status: "Clicking device library..." },
      success: { label: "Device library opened." },
    });

    yield* tasks.runTask({
      path: paths.selectDevice,
      effect: runScriptInXToolStudio(
        selectDeviceScript,
        newProjectTarget.Runtime,
      ),
      loading: { status: `Clicking ${deviceName}...` },
      success: { label: `${deviceName} selected.` },
    });

    yield* tasks.runTask({
      path: paths.confirmSwitch,
      effect: runScriptInXToolStudio(
        clickConfirmSwitch(deviceName),
        newProjectTarget.Runtime,
      ),
      loading: { status: "Confirming device switch..." },
      success: { label: "Device switch confirmed." },
    });

    yield* tasks.runTask({
      path: paths.setWindowSize,
      effect: runAppleScript(
        applescriptSetWindowSize("xTool Studio", 1280, 720),
      ).pipe(
        Effect.retry(Schedule.exponential(1000)),
        Effect.timeout(Duration.seconds(10)),
      ),
      loading: { status: "Setting window to 1280x720..." },
      success: { label: "xTool Studio window sized." },
    });

    yield* tasks.patchTask(paths.root, {
      state: "success",
      label: `${deviceName} selected.`,
      status: "",
    });
  },
);
