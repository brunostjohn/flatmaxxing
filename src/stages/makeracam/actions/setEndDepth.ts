import { Effect } from "effect";
import { setValueByLabel } from "../helpers";
import type { ToolpathKind } from "../types";

export const setEndDepth = Effect.fn("flatmaxx.makeracam.setEndDepth")(
  function* (pid: number, kind: ToolpathKind, mm: number) {
    const labelTitle = kind === "drill" ? "Drill Tip End Depth" : "End Depth";
    yield* setValueByLabel(pid, labelTitle, String(mm)).pipe(
      Effect.catch(() => setValueByLabel(pid, "End Depth", String(mm))),
    );
  },
);
