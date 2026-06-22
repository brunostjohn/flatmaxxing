import { setWindowBounds, waitForElement } from "@/macos";
import { Effect } from "effect";
import { dismissRestorePrompt, dismissUpdateNag } from "./actions";
import { MAKERACAM_APP } from "./actions";
import {
	DEFAULT_APP_PATH,
	getMakeraCamPids,
	launchMakeraCam,
	quitMakeraCam,
} from "./process";
import type { MakeracamStepOptions } from "./types";

/** Reporter callback for surfacing lifecycle progress to the stage UI. */
export type LifecycleReport = (message: string) => Effect.Effect<void>;

const noopReport: LifecycleReport = () => Effect.void;

export interface MakeraCamSession {
	readonly pid: number;
}

/**
 * Run `body` against a freshly-launched MakeraCAM session, quitting the
 * owned process when `body` completes (success OR failure) via
 * `Effect.addFinalizer`. Wrapped in `Effect.scoped` so the finalizer fires
 * per-session (launch-per-step), independent of any outer scope.
 *
 * Fails fast if MakeraCAM is already running (v1 `existingProcess: "prompt"`
 * just asks the user to close it — no interactive prompt).
 */
export const withMakeraCamSession = <A, E, R>(
	options: MakeracamStepOptions,
	body: (session: MakeraCamSession) => Effect.Effect<A, E, R>,
	report: LifecycleReport = noopReport,
) =>
	Effect.scoped(
		Effect.gen(function* () {
			yield* report("Checking for an existing MakeraCAM process...");
			const existing = yield* getMakeraCamPids();
			if (existing.length > 0) {
				return yield* Effect.fail(
					new Error(
						`MakeraCAM is already running (PID(s): ${existing.join(", ")}). ` +
							"Close it and re-run — flatmaxx must own the MakeraCAM process " +
							"it drives.",
					),
				);
			}

			yield* report("Launching MakeraCAM...");
			const appPath = options.appPath || DEFAULT_APP_PATH;
			const pid = yield* launchMakeraCam(appPath);

			// Quit the owned pid on the way out (success or failure).
			yield* Effect.addFinalizer(() => quitMakeraCam(pid).pipe(Effect.ignore));

			// A crash / force-quit leaves a "restore the auto-saved file?" dialog
			// that blocks the welcome window — dismiss it (click "No") and wait for
			// the welcome to come up. This must run BEFORE the welcome-wait below.
			yield* report("Waiting for the MakeraCAM welcome window...");
			yield* dismissRestorePrompt(pid);

			// Force a known window geometry for coordinate stability.
			const b = options.windowBounds;
			yield* setWindowBounds(MAKERACAM_APP, b).pipe(Effect.ignore);

			// Dismiss a tips/update popup if it appeared on launch (best-effort).
			yield* dismissUpdateNag(pid).pipe(Effect.ignore);

			// Confirm the welcome window is up (dismissRestorePrompt already waited).
			yield* waitForElement(pid, { title: "3 AXIS" }, { timeoutMs: 30_000 });

			// Re-apply window bounds now that the window definitely exists (the first
			// attempt may have raced the launch).
			yield* setWindowBounds(MAKERACAM_APP, b).pipe(Effect.ignore);

			return yield* body({ pid });
		}),
	);
