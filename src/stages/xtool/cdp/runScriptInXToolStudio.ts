import type { Client } from "chrome-remote-interface";
import { XToolError } from "@/errors";
import { Duration, Effect, Schedule } from "effect";

const evaluateScriptUnsafe = (
  runtime: Client["Runtime"],
  script: string,
  returnByValue: boolean,
) =>
  runtime.evaluate({
    expression: script,
    awaitPromise: true,
    returnByValue,
  });

export const runScriptInXToolStudio = Effect.fn(
  "flatmaxx.xtool.runScriptInStudio",
)(
  function* (
    script: string,
    runtime: Client["Runtime"],
    returnByValue: boolean = false,
  ) {
    const res = yield* Effect.tryPromise({
      try: () => evaluateScriptUnsafe(runtime, script, returnByValue),
      catch: (cause) =>
        new XToolError({
          message: "Unable to run xTool Studio script.",
          cause,
        }),
    });

    if (res.exceptionDetails) {
      return yield* Effect.fail(
        new XToolError({
          message:
            res.exceptionDetails.exception?.description ??
            "xTool Studio script failed.",
          cause: res.exceptionDetails,
        }),
      );
    }

    return res.result.value;
  },
  Effect.retry(
    Schedule.exponential(Duration.seconds(1)).pipe(
      Schedule.both(Schedule.recurs(3)),
    ),
  ),
);
