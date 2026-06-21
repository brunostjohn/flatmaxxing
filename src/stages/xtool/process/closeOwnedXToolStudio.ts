import { Effect } from "effect";
import { getRunningProcessIds } from "./getRunningProcessIds";
import { killProcessIds } from "./killProcessIds";
import type { XToolStudioProcess } from "./types";
import { waitForProcessIdsToExit } from "./waitForProcessIdsToExit";

export const closeOwnedXToolStudio = Effect.fn(
	"flatmaxx.xtool.process.closeOwned",
)(function* (process: XToolStudioProcess) {
	const runningProcessIds = yield* getRunningProcessIds(process.processIds);

	if (runningProcessIds.length === 0) {
		return;
	}

	yield* killProcessIds(runningProcessIds, "SIGTERM");

	const termWaitResult = yield* waitForProcessIdsToExit(
		process.processIds,
	).pipe(Effect.exit);

	if (termWaitResult._tag === "Success") {
		return;
	}

	const afterTermProcessIds = yield* getRunningProcessIds(process.processIds);
	yield* killProcessIds(afterTermProcessIds, "SIGKILL");
	yield* waitForProcessIdsToExit(process.processIds);
});
