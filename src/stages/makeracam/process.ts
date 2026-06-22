import { Duration, Effect } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process";

/** Process name `pgrep -x` matches against. */
export const MAKERACAM_PROCESS = "MakeraCAM";

/** Default location of the MakeraCAM app bundle. */
export const DEFAULT_APP_PATH = "/Applications/MakeraCAM.app";

const parsePgrepOutput = (output: string): number[] =>
	output
		.split(/\s+/)
		.map((value) => Number.parseInt(value, 10))
		.filter((value) => Number.isInteger(value) && value > 0);

/**
 * Running MakeraCAM pids (empty when none). `pgrep -x` exits 1 on no-match,
 * which `spawner.string` surfaces as an empty stdout string rather than a
 * failure — so an empty result means "not running".
 */
export const getMakeraCamPids = Effect.fn("flatmaxx.makeracam.getPids")(
	function* () {
		const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
		const output = yield* spawner.string(
			ChildProcess.make("pgrep", ["-x", MAKERACAM_PROCESS]),
		);
		return parsePgrepOutput(output);
	},
);

/**
 * Launch a fresh MakeraCAM instance (`open -na <appPath>`) and poll until a pid
 * appears, returning it. `-n` forces a new instance even if one is already
 * running (the lifecycle guards against that case separately).
 */
export const launchMakeraCam = Effect.fn("flatmaxx.makeracam.launch")(
	function* (appPath: string = DEFAULT_APP_PATH) {
		const proc = yield* ChildProcess.make("open", ["-na", appPath]);
		const exitCode = yield* proc.exitCode;
		if (exitCode !== 0) {
			return yield* Effect.fail(
				new Error(`Failed to launch MakeraCAM (open -na exited ${exitCode}).`),
			);
		}

		// Poll for the pid (open returns before the app registers with pgrep).
		const everyMs = 500;
		const attempts = 120; // ~60s
		for (let i = 0; i < attempts; i++) {
			const pids = yield* getMakeraCamPids();
			const pid = pids[0];
			if (pid !== undefined) return pid;
			yield* Effect.sleep(Duration.millis(everyMs));
		}
		return yield* Effect.fail(
			new Error("MakeraCAM did not appear to pgrep after launch."),
		);
	},
);

/**
 * Quit a MakeraCAM pid: SIGTERM, wait for a grace period, then SIGKILL if it
 * is still alive. Swallows ESRCH (already gone).
 */
export const quitMakeraCam = Effect.fn("flatmaxx.makeracam.quit")(function* (
	pid: number,
) {
	const stillAlive = (): boolean => {
		try {
			globalThis.process.kill(pid, 0);
			return true;
		} catch {
			return false;
		}
	};

	const send = (signal: "SIGTERM" | "SIGKILL"): void => {
		try {
			globalThis.process.kill(pid, signal);
		} catch (error) {
			if (
				!(error instanceof Error && "code" in error && error.code === "ESRCH")
			) {
				throw error;
			}
		}
	};

	yield* Effect.sync(() => send("SIGTERM"));

	// Grace period: poll for exit before escalating.
	const everyMs = 500;
	const attempts = 20; // ~10s grace
	for (let i = 0; i < attempts; i++) {
		if (!stillAlive()) return;
		yield* Effect.sleep(Duration.millis(everyMs));
	}

	yield* Effect.sync(() => send("SIGKILL"));
});
