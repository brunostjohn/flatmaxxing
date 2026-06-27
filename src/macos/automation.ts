import { ScreenshotError } from "@/errors";
import { Duration, Effect, Match } from "effect";
import { ChildProcess } from "effect/unstable/process";
import { KEY_ESCAPE, KEY_GO_TO_FOLDER, KEY_RETURN } from "./constants";
import { runAppleScript } from "./runAppleScript";
import type { Rect } from "./types";

export type Modifier = "command" | "shift" | "option" | "control";

const escapeAppleScript = (s: string) =>
  s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

const usingClause = (mods: readonly Modifier[]) =>
  Match.value(mods.length === 0).pipe(
    Match.when(true, () => ""),
    Match.orElse(() => ` using {${mods.map((m) => `${m} down`).join(", ")}}`),
  );

const regionArgs = (region: Rect | undefined) =>
  region === undefined
    ? []
    : ["-R", `${region.x},${region.y},${region.w},${region.h}`];

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
    yield* pressKeyCode(KEY_RETURN);
  },
);

export const pressEscape = Effect.fn("flatmaxx.macos.pressEscape")(
  function* () {
    yield* pressKeyCode(KEY_ESCAPE);
  },
);

export const goToPath = Effect.fn("flatmaxx.macos.goToPath")(function* (
  path: string,
) {
  yield* pressKeyCode(KEY_GO_TO_FOLDER, ["command", "shift"]);
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
  const args = ["-x", ...regionArgs(region), outPath];
  const proc = yield* ChildProcess.make("screencapture", args);
  const exitCode = yield* proc.exitCode;

  return yield* Match.value(exitCode === 0).pipe(
    Match.when(true, () => Effect.succeed(outPath)),
    Match.orElse(() =>
      Effect.fail(
        new ScreenshotError({
          message: `screencapture exited ${exitCode} → ${outPath}`,
        }),
      ),
    ),
  );
});
