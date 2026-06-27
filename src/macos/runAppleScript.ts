import { AppleScriptError } from "@/errors";
import { runCollectingBoth } from "@/process";
import { Effect, Match } from "effect";

export const runAppleScript = Effect.fn("flatmaxx.macos.runAppleScript")(
  function* (script: string) {
    const { stdout, stderr, exitCode } = yield* runCollectingBoth("osascript", [
      "-e",
      script,
    ]);

    return yield* Match.value(exitCode === 0).pipe(
      Match.when(true, () => Effect.succeed(stdout)),
      Match.orElse(() =>
        Effect.fail(
          new AppleScriptError({
            message: `osascript exited ${exitCode}: ${stderr.trim()}`,
          }),
        ),
      ),
    );
  },
);
