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

export type LifecycleReport = (message: string) => Effect.Effect<void>;

const noopReport: LifecycleReport = () => Effect.void;

export interface MakeraCamSession {
	readonly pid: number;
}

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

			yield* Effect.addFinalizer(() => quitMakeraCam(pid).pipe(Effect.ignore));

			yield* report("Waiting for the MakeraCAM welcome window...");
			yield* dismissRestorePrompt(pid);

			const b = options.windowBounds;
			yield* setWindowBounds(MAKERACAM_APP, b).pipe(Effect.ignore);

			yield* dismissUpdateNag(pid).pipe(Effect.ignore);

			yield* waitForElement(pid, { title: "3 AXIS" }, { timeoutMs: 30_000 });

			yield* setWindowBounds(MAKERACAM_APP, b).pipe(Effect.ignore);

			return yield* body({ pid });
		}),
	);
