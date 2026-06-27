import { Effect } from "effect";
import { getRunningProcessIds } from "./getRunningProcessIds";

const killProcessId = (
  processId: number,
  signal: "SIGINT" | "SIGTERM" | "SIGKILL",
) => {
  try {
    globalThis.process.kill(processId, signal);
  } catch (error) {
    if (
      !(error instanceof Error && "code" in error && error.code === "ESRCH")
    ) {
      throw error;
    }
  }
};

export const killProcessIds = Effect.fn(
  "flatmaxx.xtool.process.killProcessIds",
)(function* (
  processIds: readonly number[],
  signal: "SIGINT" | "SIGTERM" | "SIGKILL",
) {
  if (processIds.length === 0) {
    return;
  }

  const runningProcessIds = yield* getRunningProcessIds(processIds);

  yield* Effect.forEach(
    runningProcessIds,
    (processId) => Effect.sync(() => killProcessId(processId, signal)),
    { discard: true },
  );
});
