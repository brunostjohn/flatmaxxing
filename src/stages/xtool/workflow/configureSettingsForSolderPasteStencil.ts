import type { StencilXToolOptions } from "@/config";
import type { Client } from "chrome-remote-interface";
import { Effect } from "effect";
import {
  getFiberLaserSelector,
  getCutBoundingBox,
  getLaserTypeSelector,
  getParameterOverviewItemBox,
  getPassesSpanBox,
  getPowerSpanBox,
  getSpeedSpanBox,
} from "../scripts";
import { clickXToolBoundingBox } from "./clickXToolBoundingBox";
import { typeIntoXToolSetting } from "./typeIntoXToolSetting";
import type { SolderPasteStencilSettingsTaskPaths, XToolTasks } from "./types";

export const configureSettingsForSolderPasteStencil = Effect.fn(
  "flatmaxx.xtool.configureSettingsForSolderPasteStencil",
)(function* (
  { Runtime, Input }: Pick<Client, "Runtime" | "Input">,
  tasks: XToolTasks,
  paths: SolderPasteStencilSettingsTaskPaths,
  settings: StencilXToolOptions = {
    device: "F1 Ultra",
    power: 100,
    speed: 6000,
    passes: 3,
  },
) {
  yield* tasks.patchTask(paths.root, {
    state: "loading",
    status: "Configuring F1 Ultra stencil cut settings...",
  });

  yield* tasks.runTask({
    path: paths.openParameters,
    effect: clickXToolBoundingBox(getParameterOverviewItemBox, {
      Runtime,
      Input,
    }),
    loading: { status: "Opening parameter overview item..." },
    success: { label: "Parameter panel opened." },
  });

  yield* tasks.runTask({
    path: paths.selectCut,
    effect: clickXToolBoundingBox(getCutBoundingBox, { Runtime, Input }),
    loading: { status: "Clicking Cut operation..." },
    success: { label: "Cut operation selected." },
  });

  yield* tasks.runTask({
    path: paths.openLaserType,
    effect: clickXToolBoundingBox(getLaserTypeSelector, { Runtime, Input }),
    loading: { status: "Opening laser type selector..." },
    success: { label: "Laser type selector opened." },
  });

  yield* tasks.runTask({
    path: paths.selectFiberLaser,
    effect: clickXToolBoundingBox(getFiberLaserSelector, { Runtime, Input }),
    loading: { status: "Selecting Fiber IR laser..." },
    success: { label: "Fiber IR laser selected." },
  });

  yield* tasks.runTask({
    path: paths.setPower,
    effect: typeIntoXToolSetting(getPowerSpanBox, String(settings.power), {
      Runtime,
      Input,
    }),
    loading: { status: `Typing power ${settings.power}...` },
    success: { label: `Power set to ${settings.power}%.` },
  });

  yield* tasks.runTask({
    path: paths.setSpeed,
    effect: typeIntoXToolSetting(getSpeedSpanBox, String(settings.speed), {
      Runtime,
      Input,
    }),
    loading: { status: `Typing speed ${settings.speed}...` },
    success: { label: `Speed set to ${settings.speed}.` },
  });

  yield* tasks.runTask({
    path: paths.setPasses,
    effect: typeIntoXToolSetting(getPassesSpanBox, String(settings.passes), {
      Runtime,
      Input,
    }),
    loading: { status: `Typing passes ${settings.passes}...` },
    success: { label: `Passes set to ${settings.passes}.` },
  });

  yield* tasks.patchTask(paths.root, {
    state: "success",
    label: "Stencil cut settings configured.",
    status: "",
  });
});
