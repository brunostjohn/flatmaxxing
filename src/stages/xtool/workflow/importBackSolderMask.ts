import type { Client } from "chrome-remote-interface";
import { Effect } from "effect";
import { importSolderMask } from "./importSolderMask";
import type { XToolTasks } from "./types";

export const importBackSolderMask = Effect.fn(
	"flatmaxx.xtool.importBackSolderMask",
)(function* (
	projectPath: string,
	pcbName: string,
	newProjectTarget: Client,
	tasks: XToolTasks,
	offsetSecondToTheRightBy: number,
	offsetBackToTheBottomBy: number,
) {
	yield* importSolderMask(
		projectPath,
		pcbName,
		"back",
		newProjectTarget,
		tasks,
		{ bottom: offsetBackToTheBottomBy },
		{ right: offsetSecondToTheRightBy, bottom: offsetBackToTheBottomBy },
	);
});
