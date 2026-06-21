import type { Client } from "chrome-remote-interface";
import { Effect, Schedule } from "effect";
import { runScriptInXToolStudio } from "../cdp";
import { isShellCreateProjectButtonReady } from "../scripts";

export const waitForXToolStudioShellCreateProjectButton = Effect.fn(
	"flatmaxx.xtool.waitForShellCreateProjectButton",
)(function* ({ Runtime }: Pick<Client, "Runtime">) {
	const waitForCreateProjectButton = Effect.gen(function* () {
		const isReady = yield* runScriptInXToolStudio(
			isShellCreateProjectButtonReady,
			Runtime,
			true,
		);

		if (!isReady) {
			return yield* Effect.fail(
				new Error("xTool Studio shell plus button is not ready"),
			);
		}
	});

	yield* waitForCreateProjectButton.pipe(
		Effect.retry(
			Schedule.spaced(500).pipe(Schedule.both(Schedule.recurs(120))),
		),
	);
});
