import { Effect } from "effect";
import { getRunningProcessIds } from "./getRunningProcessIds";

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

	yield* Effect.sync(() => {
		for (const processId of runningProcessIds) {
			try {
				globalThis.process.kill(processId, signal);
			} catch (error) {
				if (
					!(
						error instanceof Error &&
						"code" in error &&
						error.code === "ESRCH"
					)
				) {
					throw error;
				}
			}
		}
	});
});
