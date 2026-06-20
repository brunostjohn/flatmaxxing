import type { Client } from "chrome-remote-interface";
import { Effect } from "effect";
import { importSolderMask } from "./importSolderMask";
import type { XToolTasks } from "./types";

export const importFrontSolderMask = Effect.fn(
	"flatmaxx.xtool.importFrontSolderMask",
)(function* (
	projectPath: string,
	pcbName: string,
	newProjectTarget: Client,
	tasks: XToolTasks,
	offsetSecondToTheRightBy: number,
) {
	yield* importSolderMask(
		projectPath,
		pcbName,
		"front",
		newProjectTarget,
		tasks,
		{},
		{ right: offsetSecondToTheRightBy },
	);
});
