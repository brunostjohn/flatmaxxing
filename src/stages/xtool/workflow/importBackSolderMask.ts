import type { Client } from "chrome-remote-interface";
import { Effect } from "effect";
import { importSolderMask } from "./importSolderMask";
import type { SolderMaskImportOptions, XToolTasks } from "./types";

export const importBackSolderMask = Effect.fn(
	"flatmaxx.xtool.importBackSolderMask",
)(function* (
	projectPath: string,
	pcbName: string,
	newProjectTarget: Client,
	tasks: XToolTasks,
	offsetSecondToTheRightBy: number,
	offsetBackToTheBottomBy: number,
	pasteSecond = true,
) {
	const options: SolderMaskImportOptions = {
		firstPasteOffsets: { bottom: offsetBackToTheBottomBy },
		secondPasteOffsets: {
			right: offsetSecondToTheRightBy,
			bottom: offsetBackToTheBottomBy,
		},
		pasteSecond,
	};

	yield* importSolderMask(
		projectPath,
		pcbName,
		"back",
		newProjectTarget,
		tasks,
		options,
	);
});
