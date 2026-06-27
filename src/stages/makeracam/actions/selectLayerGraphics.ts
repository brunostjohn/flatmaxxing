import { waitForElement } from "@/macos";
import { Duration, Effect } from "effect";
import { invokeRowMenuFromBottom } from "../helpers";

export const selectLayerGraphics = Effect.fn(
  "flatmaxx.makeracam.selectLayerGraphics",
)(function* (pid: number, layerSelector: string) {
  const row = yield* waitForElement(
    pid,
    { role: "AXGroup", titleContains: layerSelector },
    { timeout: Duration.seconds(10) },
  );
  yield* invokeRowMenuFromBottom(pid, row, 1);
});
