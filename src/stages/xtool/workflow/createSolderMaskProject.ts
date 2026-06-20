import { Effect } from "effect";
import { xToolTaskPaths } from "../tasks";
import { configureDeviceForSolderMask } from "./configureDeviceForSolderMask";
import { configureSettingsForSolderMask } from "./configureSettingsForSolderMask";
import { createNewXtoolProject } from "./createNewXtoolProject";
import { importBackSolderMask } from "./importBackSolderMask";
import { importFrontSolderMask } from "./importFrontSolderMask";
import { saveXtoolProjectAndClose } from "./saveXtoolProjectAndClose";
import type { XToolTasks } from "./types";

export const createSolderMaskProject = Effect.fn(
	"flatmaxx.xtool.createSolderMaskProject",
)(function* (
	desiredAbsolutePath: string,
	pcbName: string,
	tasks: XToolTasks,
	offsetSecondToTheRightBy: number,
	offsetBackToTheBottomBy: number,
) {
	yield* tasks.patchTask(xToolTaskPaths.project, {
		state: "loading",
		status: "Creating and configuring solder mask project...",
	});

	const newProjectTarget = yield* createNewXtoolProject(tasks);

	yield* configureDeviceForSolderMask(newProjectTarget, tasks);

	yield* importFrontSolderMask(
		desiredAbsolutePath,
		pcbName,
		newProjectTarget,
		tasks,
		offsetSecondToTheRightBy,
	);

	yield* importBackSolderMask(
		desiredAbsolutePath,
		pcbName,
		newProjectTarget,
		tasks,
		offsetSecondToTheRightBy,
		offsetBackToTheBottomBy,
	);

	yield* configureSettingsForSolderMask(
		{ Runtime: newProjectTarget.Runtime, Input: newProjectTarget.Input },
		tasks,
	);

	yield* saveXtoolProjectAndClose(
		desiredAbsolutePath,
		pcbName,
		"solderMask",
		newProjectTarget,
		tasks,
	);

	yield* tasks.patchTask(xToolTaskPaths.project, {
		state: "success",
		label: "Solder mask project created.",
		status: "",
	});
});
