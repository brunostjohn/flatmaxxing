import { Effect, FileSystem } from "effect";
import { ChildProcess } from "effect/unstable/process";

const shQuote = (value: string): string => `'${value.replace(/'/g, "'\\''")}'`;

export interface RunFlatcamOptions {
	readonly flatcam: string;
	readonly shellFile: string;
	readonly logFile: string;
	/** Sentinel the Tcl script writes when all jobs are on disk. */
	readonly doneFile: string;
	/** Max seconds to wait for completion before giving up. */
	readonly timeoutSeconds?: number;
}

/**
 * Runs a FlatCAM Tcl shellfile headlessly under offscreen Qt.
 *
 * Two FlatCAM headless realities are handled here:
 *  1. it never self-terminates (`quit_app` leaves the Qt systray loop running), and
 *  2. its multiprocessing worker children keep stdout/stderr open.
 *
 * So we don't pipe its streams or wait on its exit. Instead a wrapper shell
 * backgrounds FlatCAM (output → log file), polls for the sentinel the script
 * writes last, then kills FlatCAM and its children and exits. Effect only waits
 * on that short-lived `sh`, whose exit code we trust: 0 = sentinel seen.
 */
export const runFlatcam = Effect.fn("flatmaxx.generateCncJobs.runFlatcam")(
	function* (options: RunFlatcamOptions) {
		const fs = yield* FileSystem.FileSystem;
		// Avoid a stale sentinel from a previous run in a reused dir.
		yield* fs.remove(options.doneFile).pipe(Effect.ignore);

		const timeout = options.timeoutSeconds ?? 1800;
		const q = {
			flatcam: shQuote(options.flatcam),
			shell: shQuote(options.shellFile),
			log: shQuote(options.logFile),
			done: shQuote(options.doneFile),
		};

		const wrapper = [
			`${q.flatcam} --shellfile=${q.shell} --headless=1 > ${q.log} 2>&1 &`,
			"FPID=$!",
			"i=0",
			`while [ $i -lt ${timeout} ]; do`,
			`  if [ -f ${q.done} ]; then break; fi`,
			"  if ! kill -0 $FPID 2>/dev/null; then break; fi",
			"  sleep 1",
			"  i=$((i+1))",
			"done",
			"pkill -9 -P $FPID 2>/dev/null",
			"kill -9 $FPID 2>/dev/null",
			`if [ -f ${q.done} ]; then exit 0; else exit 1; fi`,
		].join("\n");

		const handle = yield* ChildProcess.make("sh", ["-c", wrapper], {
			env: { QT_QPA_PLATFORM: "offscreen" },
			extendEnv: true,
			stdout: "ignore",
			stderr: "ignore",
		});

		const code = yield* handle.exitCode;

		if (code !== 0) {
			const log = (yield* fs
				.readFileString(options.logFile)
				.pipe(Effect.orElseSucceed(() => "(no log captured)"))) as string;
			const tail = log.split(/\r?\n/).slice(-40).join("\n");
			return yield* Effect.fail(
				new Error(
					`FlatCAM did not finish (sentinel not written within ${timeout}s).\n${tail}`,
				),
			);
		}
	},
	Effect.scoped,
);
