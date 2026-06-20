import { runAppleScript } from "@/utils";
import type { Client } from "chrome-remote-interface";
import { Duration, Effect, Schedule } from "effect";
import { runScriptInXToolStudio } from "../cdp";
import {
	applescriptSetWindowSize,
	clickConfirmSwitch,
	clickDeviceLibrary,
	clickDeviceSwitch,
	clickInkjetPrinting,
	clickM1Ultra,
	clickMode,
} from "../scripts";
import { xToolTaskPaths } from "../tasks";
import type { XToolTasks } from "./types";

export const configureDeviceForSolderMask = Effect.fn(
	"flatmaxx.xtool.configureDeviceForSolderMask",
)(function* (newProjectTarget: Client, tasks: XToolTasks) {
	const paths = xToolTaskPaths.device;

	yield* tasks.patchTask(paths.root, {
		state: "loading",
		status: "Selecting xTool M1 Ultra inkjet mode...",
	});

	yield* tasks.runTask({
		path: paths.switchDevice,
		effect: runScriptInXToolStudio(clickDeviceSwitch, newProjectTarget.Runtime),
		loading: { status: "Clicking device switch..." },
		success: { label: "Device switcher opened." },
	});

	yield* tasks.runTask({
		path: paths.openDeviceLibrary,
		effect: runScriptInXToolStudio(
			clickDeviceLibrary,
			newProjectTarget.Runtime,
		),
		loading: { status: "Clicking device library..." },
		success: { label: "Device library opened." },
	});

	yield* tasks.runTask({
		path: paths.selectM1Ultra,
		effect: runScriptInXToolStudio(clickM1Ultra, newProjectTarget.Runtime),
		loading: { status: "Clicking M1 Ultra..." },
		success: { label: "M1 Ultra selected." },
	});

	yield* tasks.runTask({
		path: paths.confirmSwitch,
		effect: runScriptInXToolStudio(
			clickConfirmSwitch,
			newProjectTarget.Runtime,
		),
		loading: { status: "Confirming device switch..." },
		success: { label: "Device switch confirmed." },
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

	yield* tasks.runTask({
		path: paths.setWindowSize,
		effect: runAppleScript(
			applescriptSetWindowSize("xTool Studio", 1280, 720),
		).pipe(
			Effect.retry(Schedule.exponential(1000)),
			Effect.timeout(Duration.seconds(10)),
		),
		loading: { status: "Setting window to 1280x720..." },
		success: { label: "xTool Studio window sized." },
	});

	yield* tasks.patchTask(paths.root, {
		state: "success",
		label: "Device and mode configured.",
		status: "",
	});
});
