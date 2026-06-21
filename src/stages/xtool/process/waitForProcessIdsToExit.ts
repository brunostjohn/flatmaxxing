import { Effect, Schedule } from "effect";
import { getRunningProcessIds } from "./getRunningProcessIds";

export const waitForProcessIdsToExit = Effect.fn(
	"flatmaxx.xtool.process.waitForProcessIdsToExit",
)(function* (processIds: readonly number[]) {
	const waitForNoProcesses = Effect.gen(function* () {
		const runningProcessIds = yield* getRunningProcessIds(processIds);

		if (runningProcessIds.length > 0) {
			return yield* Effect.fail(
				new Error(
					`xTool Studio process is still running: ${runningProcessIds.join(", ")}`,
				),
			);
		}
	});

	yield* waitForNoProcesses.pipe(
		Effect.retry(Schedule.spaced(500).pipe(Schedule.both(Schedule.recurs(20)))),
	);
});
