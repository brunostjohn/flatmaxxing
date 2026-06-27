import { clickElement, goToPath, waitForElement, waitForGone } from "@/macos";
import { Duration, Effect } from "effect";
import { SETTLE } from "../constants";

export const saveViaDialog = Effect.fnUntraced(function* (
  pid: number,
  opener: string,
  absPath: string,
) {
  yield* clickElement(pid, { role: "AXButton", title: opener });
  yield* waitForElement(
    pid,
    { id: "save-panel" },
    { timeout: Duration.seconds(15) },
  );
  yield* goToPath(absPath);
  yield* Effect.sleep(SETTLE);
  yield* clickElement(pid, { id: "OKButton" }).pipe(
    Effect.catch(() => clickElement(pid, { role: "AXButton", title: "Save" })),
  );
  yield* waitForGone(
    pid,
    { id: "save-panel" },
    { timeout: Duration.seconds(30) },
  );
  yield* Effect.sleep(SETTLE);
});
