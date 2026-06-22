import type { SolderMaskXToolOptions } from "@/config";
import type { Client } from "chrome-remote-interface";
import { Duration, Effect } from "effect";
import { cdpClickOn, cdpTypeIn, runScriptInXToolStudio } from "../cdp";
import {
  getIntensitySpanBox,
  getParameterOverviewItemBox,
  getPassesSpanBox,
} from "../scripts";
import { xToolTaskPaths } from "../tasks";
import { clearXToolSelection } from "./clearXToolSelection";
import type { RectBounds, XToolTasks } from "./types";

export const configureSettingsForSolderMask = Effect.fn(
  "flatmaxx.xtool.configureSettingsForSolderMask",
)(function* (
  { Runtime, Input }: Pick<Client, "Runtime" | "Input">,
  tasks: XToolTasks,
  settings: SolderMaskXToolOptions = {
    device: "M1 Ultra",
    intensity: 100,
    passes: 3,
  },
) {
  const paths = xToolTaskPaths.settings;

  yield* tasks.patchTask(paths.root, {
    state: "loading",
    status: "Setting inkjet parameters...",
  });

  yield* tasks.runTask({
    path: paths.openParameters,
    effect: Effect.gen(function* () {
      const { x, y, width, height }: RectBounds = yield* runScriptInXToolStudio(
        getParameterOverviewItemBox,
        Runtime,
        true,
      );
      yield* cdpClickOn(x + width / 2, y + height / 2, Input);
      yield* Effect.sleep(Duration.millis(500));
    }),
    loading: { status: "Opening parameter overview item..." },
    success: { label: "Parameter panel opened." },
  });

  yield* tasks.runTask({
    path: paths.setIntensity,
    effect: Effect.gen(function* () {
      const {
        x: intensityX,
        y: intensityY,
        width: intensityWidth,
        height: intensityHeight,
      }: RectBounds = yield* runScriptInXToolStudio(
        getIntensitySpanBox,
        Runtime,
        true,
      );
      yield* cdpClickOn(
        intensityX + intensityWidth / 2,
        intensityY + intensityHeight / 2,
        Input,
      );
      yield* cdpTypeIn(String(settings.intensity), Input, true);
      yield* Effect.sleep(Duration.millis(500));
    }),
    loading: { status: `Typing intensity ${settings.intensity}...` },
    success: { label: `Intensity set to ${settings.intensity}.` },
  });

  yield* tasks.runTask({
    path: paths.setPasses,
    effect: Effect.gen(function* () {
      const {
        x: passesX,
        y: passesY,
        width: passesWidth,
        height: passesHeight,
      }: RectBounds = yield* runScriptInXToolStudio(
        getPassesSpanBox,
        Runtime,
        true,
      );
      yield* cdpClickOn(
        passesX + passesWidth / 2,
        passesY + passesHeight / 2,
        Input,
      );
      yield* cdpTypeIn(String(settings.passes), Input, true);
      yield* Effect.sleep(Duration.millis(500));
    }),
    loading: { status: `Typing passes ${settings.passes}...` },
    success: { label: `Passes set to ${settings.passes}.` },
  });

  yield* tasks.runTask({
    path: paths.clearSelection,
    effect: Effect.gen(function* () {
      yield* clearXToolSelection({ Runtime, Input });
      yield* Effect.sleep(Duration.millis(500));
    }),
    loading: { status: "Clearing final selection..." },
    success: { label: "Final selection cleared." },
  });

  yield* tasks.patchTask(paths.root, {
    state: "success",
    label: "Inkjet settings configured.",
    status: "",
  });
});
