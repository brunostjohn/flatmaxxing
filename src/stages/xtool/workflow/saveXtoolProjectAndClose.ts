import { runAppleScript } from "@/utils";
import type { Client } from "chrome-remote-interface";
import { Effect, FileSystem } from "effect";
import { resolve } from "node:path";
import { runScriptInXToolStudio } from "../cdp";
import {
	applescriptBringDialogToFront,
	applescriptSave,
	clickSaveAs,
	shellClickOnSaveScript,
} from "../scripts";
import { xToolTaskPaths } from "../tasks";
import type { SaveProjectTaskPaths, XToolTasks } from "./types";

export const saveXtoolProjectAndClose = Effect.fn(
	"flatmaxx.xtool.saveProjectAndClose",
)(function* (
	desiredAbsolutePath: string,
	filename: string,
	{ Runtime }: Client,
	tasks: XToolTasks,
	paths: SaveProjectTaskPaths = xToolTaskPaths.save,
) {
	const fs = yield* FileSystem.FileSystem;
	const absolutePath = yield* Effect.sync(() =>
		resolve(desiredAbsolutePath, filename),
	);

	yield* tasks.patchTask(paths.root, {
		state: "loading",
		status: `Saving ${absolutePath}...`,
	});

	yield* tasks.patchTask(paths.removeExisting, {
		state: "loading",
		status: "Checking for existing .xs file...",
	});
	const fileExists = yield* fs.exists(absolutePath);
	if (fileExists) {
		yield* fs.remove(absolutePath, { force: true });
	}
	yield* tasks.patchTask(paths.removeExisting, {
		state: "success",
		label: fileExists ? "Existing .xs file removed." : "No existing .xs file.",
		status: "",
	});

	yield* tasks.runTask({
		path: paths.openSaveAs,
		effect: runScriptInXToolStudio(clickSaveAs, Runtime),
		loading: { status: "Opening File > Save as..." },
		success: { label: "Save As opened." },
	});

	yield* tasks.runTask({
		path: paths.clickSaveLocally,
		effect: runScriptInXToolStudio(shellClickOnSaveScript, Runtime),
		loading: { status: "Clicking Save locally..." },
		success: { label: "Save locally clicked." },
	});

	yield* tasks.runTask({
		path: paths.focusDialog,
		effect: runAppleScript(applescriptBringDialogToFront("xTool Studio")),
		loading: { status: "Bringing save dialog to front..." },
		success: { label: "Save dialog focused." },
	});

	yield* tasks.runTask({
		path: paths.savePath,
		effect: runAppleScript(applescriptSave("xTool Studio", absolutePath)),
		loading: { status: `Saving to ${absolutePath}...` },
		success: { label: "Project saved to target path." },
	});

	yield* tasks.patchTask(paths.root, {
		state: "success",
		label: "xTool project saved.",
		status: "",
	});
});
