import { clickElement, waitForElement, waitForGone } from "@/macos";
import { Duration, Effect } from "effect";
import { SETTLE } from "../constants";

export const closeToolpathDialog = Effect.fn(
  "flatmaxx.makeracam.closeToolpathDialog",
)(function* (pid: number) {
  yield* waitForElement(
    pid,
    { role: "AXButton", title: "Close" },
    { timeout: Duration.seconds(90) },
  );
  yield* clickElement(pid, { role: "AXButton", title: "Close" });
  yield* waitForGone(
    pid,
    { role: "AXButton", title: "Calculate" },
    { timeout: Duration.seconds(10) },
  ).pipe(Effect.ignore);
  yield* Effect.sleep(SETTLE);
});
