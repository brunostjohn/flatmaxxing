import { Effect } from "effect";
import {
	getXToolStudioOpenArgs,
	xToolStudioCdpPort,
	xToolStudioOpenArgs,
} from "./constants";
import { runProcessAndCollectOutput } from "./runProcessAndCollectOutput";
import type { XToolStudioProcess, XToolStudioRuntimeOptions } from "./types";
import { waitForXToolStudioProcessIds } from "./waitForXToolStudioProcessIds";

export const launchXToolStudio = Effect.fn("flatmaxx.xtool.process.launch")(
	function* (options?: Partial<XToolStudioRuntimeOptions>) {
		const openArgs =
			options === undefined
				? xToolStudioOpenArgs
				: getXToolStudioOpenArgs({
						appPath: options.appPath,
						cdpPort: options.cdpPort ?? xToolStudioCdpPort,
					});
		const result = yield* runProcessAndCollectOutput("open", openArgs);

		if (result.exitCode !== 0) {
			return yield* Effect.fail(
				new Error(
					`Failed to open xTool Studio with CDP flags: ${result.stderr || result.stdout}`,
				),
			);
		}

		const processIds = yield* waitForXToolStudioProcessIds();

		return { processIds } satisfies XToolStudioProcess;
	},
);
