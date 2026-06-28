import {
  axFind,
  clickAt,
  clickElement,
  goToPath,
  waitForElement,
  waitForGone,
} from "@/macos";
import { Duration, Effect } from "effect";
import { SETTLE, TOOLBAR_BOTTOM_Y } from "../constants";

const clickOpener = Effect.fnUntraced(function* (pid: number, opener: string) {
  const buttons = yield* axFind(pid, { role: "AXButton", title: opener });
  const dialogButton = buttons.find((button) => button.y >= TOOLBAR_BOTTOM_Y);
  if (dialogButton === undefined) {
    yield* clickElement(pid, { role: "AXButton", title: opener });
    return;
  }
  yield* clickAt({ x: dialogButton.cx, y: dialogButton.cy });
});

export const saveViaDialog = Effect.fnUntraced(function* (
  pid: number,
  opener: string,
  absPath: string,
) {
  yield* clickOpener(pid, opener);
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
