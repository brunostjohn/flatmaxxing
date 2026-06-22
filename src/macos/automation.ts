import { runAppleScript } from "@/utils";
import { Duration, Effect } from "effect";
import { ChildProcess } from "effect/unstable/process";
import { ScreenshotError } from "./errors";
import type { Rect } from "./types";

export {
  axActions,
  axFind,
  axTrusted,
  mouseClick as clickAt,
  clickElement,
  mouseDoubleClick as doubleClickAt,
  doubleClickElement,
  elementExists,
  findElement,
  mouseMove,
  mousePos,
  mouseScroll,
  axPerformAction as performAction,
  pickElement,
  axPress as pressElement,
  mouseRightClick as rightClickAt,
  rightClickElement,
  scrollToVisible,
  axSetValue as setElementValue,
  showMenu,
  waitForElement,
  waitForGone,
} from "./nativeHelper";

const escapeAppleScript = (s: string): string =>
  s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

export type Modifier = "command" | "shift" | "option" | "control";
const usingClause = (mods: readonly Modifier[]): string =>
  mods.length === 0
    ? ""
    : ` using {${mods.map((m) => `${m} down`).join(", ")}}`;

export const typeText = Effect.fn("flatmaxx.macos.typeText")(function* (
  text: string,
) {
  yield* runAppleScript(
    `tell application "System Events" to keystroke "${escapeAppleScript(text)}"`,
  );
});

export const pressKeyCode = Effect.fn("flatmaxx.macos.pressKeyCode")(function* (
  keyCode: number,
  mods: readonly Modifier[] = [],
) {
  yield* runAppleScript(
    `tell application "System Events" to key code ${keyCode}${usingClause(mods)}`,
  );
});

export const pressReturn = Effect.fn("flatmaxx.macos.pressReturn")(
  function* () {
    yield* pressKeyCode(36);
  },
);
export const pressEscape = Effect.fn("flatmaxx.macos.pressEscape")(
  function* () {
    yield* pressKeyCode(53);
  },
);

export const goToPath = Effect.fn("flatmaxx.macos.goToPath")(function* (
  path: string,
) {
  yield* pressKeyCode(5, ["command", "shift"]);
  yield* Effect.sleep(Duration.millis(500));
  yield* typeText(path);
  yield* Effect.sleep(Duration.millis(250));
  yield* pressReturn();
});

export const ensureFrontmost = Effect.fn("flatmaxx.macos.ensureFrontmost")(
  function* (appName: string) {
    yield* runAppleScript(
      `tell application "System Events" to set frontmost of process "${appName}" to true`,
    );
  },
);

export const setWindowBounds = Effect.fn("flatmaxx.macos.setWindowBounds")(
  function* (appName: string, bounds: Rect) {
    yield* runAppleScript(
      `tell application "System Events" to tell process "${appName}"
\tset position of window 1 to {${bounds.x}, ${bounds.y}}
\tset size of window 1 to {${bounds.w}, ${bounds.h}}
end tell`,
    );
  },
);

export const screenshot = Effect.fn("flatmaxx.macos.screenshot")(function* (
  outPath: string,
  region?: Rect,
) {
  const args = ["-x"];
  if (region !== undefined) {
    args.push("-R", `${region.x},${region.y},${region.w},${region.h}`);
  }
  args.push(outPath);
  const proc = yield* ChildProcess.make("screencapture", args);
  const exitCode = yield* proc.exitCode;
  if (exitCode !== 0) {
    return yield* Effect.fail(
      new ScreenshotError({
        message: `screencapture exited ${exitCode} → ${outPath}`,
      }),
    );
  }
  return outPath;
});
