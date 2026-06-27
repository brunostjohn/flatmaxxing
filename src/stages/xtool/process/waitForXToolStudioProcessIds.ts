import { Effect, Schedule } from "effect";
import { XToolError } from "@/errors";
import { getXToolStudioProcessIds } from "./getXToolStudioProcessIds";

export const waitForXToolStudioProcessIds = Effect.fn(
  "flatmaxx.xtool.process.waitForProcessIds",
)(function* () {
  const waitForProcessIds = Effect.gen(function* () {
    const processIds = yield* getXToolStudioProcessIds();

    if (processIds.length === 0) {
      return yield* Effect.fail(
        new XToolError({
          message: "xTool Studio process is not visible to pgrep yet",
        }),
      );
    }

    return processIds;
  });

  return yield* waitForProcessIds.pipe(
    Effect.retry(
      Schedule.spaced(500).pipe(Schedule.both(Schedule.recurs(120))),
    ),
  );
});
