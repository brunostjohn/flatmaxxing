import { Effect } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process";
import { xToolStudioProcessName } from "./constants";
import { parsePgrepOutput } from "./parsePgrepOutput";

export const getXToolStudioProcessIds = Effect.fn(
	"flatmaxx.xtool.process.getProcessIds",
)(function* () {
	const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
	const output = yield* spawner.string(
		ChildProcess.make("pgrep", ["-x", xToolStudioProcessName]),
	);

	return parsePgrepOutput(output);
});
