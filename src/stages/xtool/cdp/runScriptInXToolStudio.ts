import type { Client } from "chrome-remote-interface";
import { Effect, Schedule } from "effect";

export const runScriptInXToolStudio = Effect.fn(
  "flatmaxx.xtool.runScriptInStudio",
)(
  function* (
    script: string,
    runtime: Client["Runtime"],
    returnByValue: boolean = false,
  ) {
    const res = yield* Effect.promise(() =>
      runtime.evaluate({
        expression: script,
        awaitPromise: true,
        returnByValue,
      }),
    );

    if (res.exceptionDetails) {
      return yield* Effect.fail(
        new Error(
          res.exceptionDetails.exception?.description ?? "Unknown error",
          { cause: res.exceptionDetails },
        ),
      );
    }

    return res.result.value;
  },
  Effect.retry(
    Schedule.exponential(1000).pipe(Schedule.both(Schedule.recurs(3))),
  ),
);
