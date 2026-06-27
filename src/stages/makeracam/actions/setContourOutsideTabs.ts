import { pressElement } from "@/macos";
import { Effect } from "effect";
import { SETTLE, TAB_TOP_CUT_MM, TAB_WIDTH_MM } from "../constants";
import {
  clickTabsGenerate,
  selectTabsRadio,
  setTabLayoutNumber,
  setTabParam,
} from "../helpers";

export const setContourOutsideTabs = Effect.fn(
  "flatmaxx.makeracam.setContourOutsideTabs",
)(function* (pid: number, depthMm: number, tabsPerContour: number) {
  yield* pressElement(pid, { role: "AXRadioButton", title: "Outside" });
  yield* Effect.sleep(SETTLE);
  yield* selectTabsRadio(pid, "Auto");
  yield* Effect.sleep(SETTLE);
  yield* setTabLayoutNumber(pid);
  const tabThickness = Math.max(0.3, depthMm - TAB_TOP_CUT_MM);
  yield* setTabParam(pid, "Tabs Width", String(TAB_WIDTH_MM));
  yield* setTabParam(pid, "Tab Thickness", String(tabThickness));
  yield* setTabParam(pid, "Tabs per Contour", String(tabsPerContour));
  yield* Effect.sleep(SETTLE);
  yield* clickTabsGenerate(pid);
  yield* Effect.sleep(SETTLE);
});
