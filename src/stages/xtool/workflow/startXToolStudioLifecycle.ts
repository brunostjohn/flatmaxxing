import { Effect, Ref, Schedule } from "effect";
import { getTargets, getXToolStudioShell } from "../cdp";
import {
	closeOwnedXToolStudio,
	getRunningProcessIds,
	getXToolStudioProcessIds,
	launchXToolStudio,
	waitForXToolStudioToExit,
	xToolStudioCdpPort,
	xToolStudioLaunchArgs,
	xToolStudioOpenArgs,
} from "../process";
import { xToolTaskPaths } from "../tasks";
import { confirmCloseExistingXToolStudio } from "./confirmCloseExistingXToolStudio";
import type { XToolLifecycleTaskPaths, XToolTasks } from "./types";
import { discardXToolShellRestoreModal } from "./discardXToolShellRestoreModal";
import { waitForXToolStudioShellCreateProjectButton } from "./waitForXToolStudioShellCreateProjectButton";

export const startXToolStudioLifecycle = Effect.fn(
	"flatmaxx.xtool.startLifecycle",
)(function* (
	tasks: XToolTasks,
	paths: XToolLifecycleTaskPaths = xToolTaskPaths.lifecycle,
) {
	yield* tasks.patchTask(paths.root, {
		state: "loading",
		status: "Checking xTool Studio process ownership...",
	});

	const existingProcessIds = yield* tasks.runTask({
		path: paths.checkExisting,
		effect: getXToolStudioProcessIds(),
		loading: { status: "Running pgrep for xTool Studio..." },
		success: { label: "Existing xTool Studio process check complete." },
		error: { label: "Failed to check xTool Studio processes." },
	});

	if (existingProcessIds.length > 0) {
		yield* tasks.patchTask(paths.checkExisting, {
			state: "warning",
			label: "xTool Studio is already open.",
			output: `PIDs: ${existingProcessIds.join(", ")}`,
		});

		yield* tasks.patchTask(paths.confirmCloseExisting, {
			state: "loading",
			status: "Waiting for y/n confirmation...",
		});

		const shouldWait = yield* confirmCloseExistingXToolStudio(
			existingProcessIds,
		);

		if (!shouldWait) {
			yield* tasks.patchTask(paths.confirmCloseExisting, {
				state: "error",
				label: "User declined to close xTool Studio.",
				output: "xTool Studio must be closed before flatmaxx launches it.",
			});
			yield* tasks.patchTask(paths.root, {
				state: "error",
				label: "xTool Studio lifecycle blocked.",
				output:
					"xTool Studio was already running and the user declined to continue.",
			});

			return yield* Effect.fail(
				new Error("xTool Studio was already open before the xTool stage."),
			);
		}

		yield* tasks.patchTask(paths.confirmCloseExisting, {
			state: "success",
			label: "User will close the existing xTool Studio session.",
			status: "",
		});

		yield* tasks.runTask({
			path: paths.waitExistingExit,
			effect: waitForXToolStudioToExit(),
			loading: { status: "Waiting for existing xTool Studio to exit..." },
			success: { label: "Existing xTool Studio process exited." },
			error: { label: "Timed out waiting for xTool Studio to exit." },
		});
	} else {
		yield* tasks.patchTask(paths.checkExisting, {
			state: "success",
			label: "No existing xTool Studio process.",
			status: "",
		});
		yield* tasks.patchTask(paths.confirmCloseExisting, {
			state: "success",
			label: "No existing session confirmation needed.",
			status: "",
		});
		yield* tasks.patchTask(paths.waitExistingExit, {
			state: "success",
			label: "No existing xTool Studio process to wait for.",
			status: "",
		});
	}

	const handle = yield* tasks.runTask({
		path: paths.launch,
		effect: launchXToolStudio(),
		loading: { status: `open ${xToolStudioOpenArgs.join(" ")}` },
		success: { label: "xTool Studio launched with CDP flags." },
		error: { label: "Failed to launch xTool Studio." },
	});

	yield* tasks.patchTask(paths.launch, {
		output: `PIDs: ${handle.processIds.join(", ")}; flags: ${xToolStudioLaunchArgs.join(" ")}`,
	});

	const startupCompleted = yield* Ref.make(false);

	yield* Effect.addFinalizer(() =>
		tasks
			.runTask({
				path: paths.close,
				effect: Effect.gen(function* () {
					for (const seconds of [5, 4, 3, 2, 1]) {
						yield* tasks.patchTask(paths.close, {
							status: `Closing xTool Studio in ${seconds}...`,
						});
						yield* Effect.sleep(1000);
					}

					yield* tasks.patchTask(paths.close, {
						status: `Sending SIGTERM to xTool Studio (${handle.processIds.join(", ")})...`,
					});
					yield* closeOwnedXToolStudio(handle);
				}),
				loading: { status: "Closing xTool Studio in 5..." },
				success: { label: "App-owned xTool Studio process closed." },
				error: { label: "Failed to close app-owned xTool Studio." },
			})
			.pipe(
				Effect.andThen(
					Effect.gen(function* () {
						const isReady = yield* Ref.get(startupCompleted);

						yield* tasks.patchTask(paths.root, {
							state: isReady ? "success" : "error",
							label: isReady
								? "xTool Studio lifecycle complete."
								: "xTool Studio startup failed; app-owned process closed.",
							status: "",
						});
					}),
				),
				Effect.catch((error) =>
					tasks.patchTask(paths.root, {
						state: "error",
						label: "xTool Studio lifecycle cleanup failed.",
						output: error instanceof Error ? error.message : String(error),
					}),
				),
			),
	);

	const shellClient = yield* tasks.runTask({
		path: paths.waitShell,
		effect: Effect.gen(function* () {
			const targets = yield* getTargets;
			return yield* getXToolStudioShell(targets);
		}).pipe(
			Effect.catch((error) =>
				Effect.gen(function* () {
					const runningProcessIds = yield* getRunningProcessIds(
						handle.processIds,
					);
					const processDetail =
						runningProcessIds.length > 0
							? `xTool Studio still running as PID(s): ${runningProcessIds.join(", ")}`
							: "xTool Studio process exited before CDP became ready";
					const message = error instanceof Error ? error.message : String(error);

					return yield* Effect.fail(
						new Error(`${message}. ${processDetail}.`),
					);
				}),
			),
			Effect.retry(
				Schedule.spaced(500).pipe(Schedule.both(Schedule.recurs(120))),
			),
		),
		loading: {
			status: `Waiting for CDP shell target on ${xToolStudioCdpPort}...`,
		},
		success: { label: "xTool shell CDP target connected." },
		error: { label: "Failed to connect to xTool shell CDP target." },
	});

	yield* tasks.runTask({
		path: paths.discardRestoreModal,
		effect: discardXToolShellRestoreModal(shellClient),
		loading: { status: "Checking for xTool restore modal..." },
		success: { label: "xTool restore modal check complete." },
		error: { label: "Failed to check xTool restore modal." },
	}).pipe(
		Effect.andThen((discarded) =>
			tasks.patchTask(paths.discardRestoreModal, {
				output: discarded
					? 'Clicked restore modal "Discard" button.'
					: "No restore modal found.",
			}),
		),
	);

	yield* tasks.runTask({
		path: paths.waitCreateProjectButton,
		effect: waitForXToolStudioShellCreateProjectButton(shellClient).pipe(
			Effect.ensuring(
				Effect.promise(() => shellClient.close()).pipe(Effect.orDie),
			),
		),
		loading: { status: "Waiting for shell create-project plus button..." },
		success: { label: "Shell plus button is ready." },
		error: { label: "Shell plus button did not become ready." },
	});

	yield* Ref.set(startupCompleted, true);

	yield* tasks.patchTask(paths.root, {
		state: "loading",
		label: "xTool Studio is running.",
		status: `CDP port ${xToolStudioCdpPort} is ready.`,
	});
});
