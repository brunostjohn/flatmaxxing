import type { Client } from "chrome-remote-interface";
import { Effect } from "effect";
import { importSolderMask } from "./importSolderMask";
import type { SolderMaskImportOptions, XToolTasks } from "./types";

export const importFrontSolderMask = Effect.fn(
	"flatmaxx.xtool.importFrontSolderMask",
)(function* (
	projectPath: string,
	pcbName: string,
	newProjectTarget: Client,
	tasks: XToolTasks,
	offsetSecondToTheRightBy: number,
	pasteSecond = true,
) {
	const options: SolderMaskImportOptions = {
		firstPasteOffsets: {},
		secondPasteOffsets: { right: offsetSecondToTheRightBy },
		pasteSecond,
	};

	yield* importSolderMask(
		projectPath,
		pcbName,
		"front",
		newProjectTarget,
		tasks,
		options,
	);
});
