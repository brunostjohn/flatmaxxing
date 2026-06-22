import { Effect } from "effect";
import { getXToolStudioProcessIds } from "./getXToolStudioProcessIds";

export const isXToolStudioRunning = Effect.fn(
  "flatmaxx.xtool.process.isRunning",
)(function* () {
  const processIds = yield* getXToolStudioProcessIds();

  return processIds.length > 0;
});
