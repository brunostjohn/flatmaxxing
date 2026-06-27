import { waitForElement } from "@/macos";
import { Duration, Effect } from "effect";
import { SETTLE } from "../constants";
import { invokeRowMenuFromBottom } from "../helpers";

export const saveAllPaths = Effect.fn("flatmaxx.makeracam.saveAllPaths")(
  function* (pid: number) {
    const row = yield* waitForElement(
      pid,
      { role: "AXGroup", title: "Path" },
      { timeout: Duration.seconds(10) },
    );
    yield* invokeRowMenuFromBottom(pid, row, 2);
    yield* waitForElement(
      pid,
      { title: "Export ToolPaths" },
      { timeout: Duration.seconds(15) },
    );
    yield* Effect.sleep(SETTLE);
  },
);
