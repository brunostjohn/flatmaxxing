import { clickElement, pressElement, waitForElement } from "@/macos";
import { Duration, Effect } from "effect";
import { SETTLE } from "../constants";
import { toolpathLabel } from "../helpers";
import type { ToolpathKind } from "../types";

export const openToolpath = Effect.fn("flatmaxx.makeracam.openToolpath")(
  function* (pid: number, kind: ToolpathKind) {
    yield* clickElement(pid, { role: "AXMenuButton", title: "2D Path" });
    yield* Effect.sleep(SETTLE);
    yield* pressElement(pid, {
      role: "AXMenuItem",
      title: toolpathLabel(kind),
    });
    yield* waitForElement(
      pid,
      { role: "AXStaticText", title: toolpathLabel(kind) },
      { timeout: Duration.seconds(15) },
    );
  },
);
