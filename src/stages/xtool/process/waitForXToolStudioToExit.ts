import { Effect, Schedule } from "effect";
import { XToolError } from "@/errors";
import { getXToolStudioProcessIds } from "./getXToolStudioProcessIds";

export const waitForXToolStudioToExit = Effect.fn(
  "flatmaxx.xtool.process.waitForExit",
)(function* () {
  const waitForNoProcesses = Effect.gen(function* () {
    const processIds = yield* getXToolStudioProcessIds();

    if (processIds.length > 0) {
      return yield* Effect.fail(
        new XToolError({
          message: `xTool Studio is still running: ${processIds.join(", ")}`,
        }),
      );
    }
  });

  yield* waitForNoProcesses.pipe(
    Effect.retry(
      Schedule.spaced(500).pipe(Schedule.both(Schedule.recurs(240))),
    ),
  );
});
