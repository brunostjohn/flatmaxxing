import type { XToolLifecycleOptions } from "@/config";
import type { Client } from "chrome-remote-interface";
import { Effect } from "effect";
import { runScriptInXToolStudio } from "../cdp";
import { clickInkjetPrinting, clickM1Ultra, clickMode } from "../scripts";
import { xToolTaskPaths } from "../tasks";
import { selectXtoolDevice } from "./selectXtoolDevice";
import type { XToolTasks } from "./types";

export const configureDeviceForSolderMask = Effect.fn(
	"flatmaxx.xtool.configureDeviceForSolderMask",
)(function* (
	newProjectTarget: Client,
	tasks: XToolTasks,
	options?: XToolLifecycleOptions,
) {
	const paths = xToolTaskPaths.device;

	yield* tasks.patchTask(paths.root, {
		state: "loading",
		status: "Selecting xTool M1 Ultra inkjet mode...",
	});

	yield* selectXtoolDevice(
		newProjectTarget,
		tasks,
		{
			...paths,
			selectDevice: paths.selectM1Ultra,
		},
		"M1 Ultra",
		clickM1Ultra,
		options?.window,
	);

	yield* tasks.patchTask(paths.root, {
		state: "loading",
		status: "Switching M1 Ultra to inkjet mode...",
	});

	yield* tasks.runTask({
		path: paths.selectFlatMode,
		effect: runScriptInXToolStudio(clickMode, newProjectTarget.Runtime),
		loading: { status: "Clicking Lasering on flat surface..." },
		success: { label: "Flat surface mode selected." },
	});

	yield* tasks.runTask({
		path: paths.selectInkjetPrinting,
		effect: runScriptInXToolStudio(
			clickInkjetPrinting,
			newProjectTarget.Runtime,
		),
		loading: { status: "Clicking Inkjet printing..." },
		success: { label: "Inkjet printing selected." },
	});

	yield* tasks.patchTask(paths.root, {
		state: "success",
		label: "Device and mode configured.",
		status: "",
	});
});
