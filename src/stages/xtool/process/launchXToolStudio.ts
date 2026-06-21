import { Effect } from "effect";
import { xToolStudioOpenArgs } from "./constants";
import { runProcessAndCollectOutput } from "./runProcessAndCollectOutput";
import type { XToolStudioProcess } from "./types";
import { waitForXToolStudioProcessIds } from "./waitForXToolStudioProcessIds";

export const launchXToolStudio = Effect.fn(
	"flatmaxx.xtool.process.launch",
)(function* () {
	const result = yield* runProcessAndCollectOutput("open", xToolStudioOpenArgs);

	if (result.exitCode !== 0) {
		return yield* Effect.fail(
			new Error(
				`Failed to open xTool Studio with CDP flags: ${result.stderr || result.stdout}`,
			),
		);
	}

	const processIds = yield* waitForXToolStudioProcessIds();

	return { processIds } satisfies XToolStudioProcess;
});
