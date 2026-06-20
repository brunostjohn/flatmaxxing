import { Effect, Schedule } from "effect";
import {
	getNewProjectTarget,
	getTargets,
	getXToolStudioShell,
	runScriptInXToolStudio,
} from "../cdp";
import { shellCreateProjectBrowserScript } from "../scripts";
import { xToolTaskPaths } from "../tasks";
import type { XToolTasks } from "./types";

export const createNewXtoolProject = Effect.fn(
	"flatmaxx.xtool.createNewProject",
)(function* (tasks: XToolTasks) {
	const paths = xToolTaskPaths.cdp;

	yield* tasks.patchTask(paths.root, {
		state: "loading",
		status: "Preparing CDP connection...",
	});

	const targets = yield* tasks.runTask({
		path: paths.listTargets,
		effect: getTargets,
		loading: { status: "Finding CDP targets on port 9333..." },
		success: { label: "CDP targets listed." },
	});

	const shellClient = yield* tasks.runTask({
		path: paths.connectShell,
		effect: getXToolStudioShell(targets),
		loading: { status: "Connecting to atomm://renderer/shell..." },
		success: { label: "Connected to xTool shell window." },
	});

	const { Runtime } = shellClient;

	yield* tasks.runTask({
		path: paths.createEditorProject,
		effect: runScriptInXToolStudio(
			shellCreateProjectBrowserScript,
			Runtime,
		).pipe(Effect.ensuring(Effect.promise(() => shellClient.close()))),
		loading: { status: "Clicking create-project in shell UI..." },
		success: { label: "Editor project requested." },
	});

	const newProjectTarget = yield* tasks.runTask({
		path: paths.connectEditor,
		effect: getNewProjectTarget().pipe(
			Effect.retry(
				Schedule.exponential(1000).pipe(Schedule.both(Schedule.recurs(3))),
			),
		),
		loading: { status: "Waiting for new Untitled editor target..." },
		success: { label: "Connected to new editor window." },
	});

	yield* tasks.patchTask(paths.root, {
		state: "success",
		label: "Connected to xTool Studio.",
		status: "",
	});

	return newProjectTarget;
});
