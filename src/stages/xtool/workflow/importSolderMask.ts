import { runAppleScript } from "@/utils";
import type { Client } from "chrome-remote-interface";
import { Effect } from "effect";
import { resolve } from "node:path";
import { applescriptCopyFileToClipboard } from "../scripts";
import { getSolderMaskBounds } from "./getSolderMaskBounds";
import { pasteIntoXToolStudio } from "./pasteIntoXToolStudio";
import { solderMaskSideConfig } from "./solderMaskSideConfig";
import type {
	SolderMaskPasteOffsets,
	SolderMaskSide,
	XToolTasks,
} from "./types";

export const importSolderMask = Effect.fn("flatmaxx.xtool.importSolderMask")(
	function* (
		projectPath: string,
		pcbName: string,
		side: SolderMaskSide,
		newProjectTarget: Client,
		tasks: XToolTasks,
		firstPasteOffsets: SolderMaskPasteOffsets,
		secondPasteOffsets: SolderMaskPasteOffsets,
	) {
		const config = solderMaskSideConfig[side];
		const paths = config.taskPaths;

		yield* tasks.patchTask(paths.root, {
			state: "loading",
			status: `Preparing ${config.fileSuffix} assets...`,
		});

		const bounds = yield* getSolderMaskBounds(
			projectPath,
			pcbName,
			side,
			tasks,
		);

		yield* tasks.runTask({
			path: paths.copyPng,
			effect: runAppleScript(
				applescriptCopyFileToClipboard(
					resolve(
						projectPath,
						"..",
						"png",
						`${pcbName}-${config.fileSuffix}.png`,
					),
				),
			),
			loading: { status: `Copying ${config.fileSuffix} PNG to clipboard...` },
			success: { label: `${config.fileSuffix} PNG copied to clipboard.` },
		});

		yield* pasteIntoXToolStudio(
			newProjectTarget,
			bounds,
			firstPasteOffsets,
			tasks,
			paths.pasteFirst,
		);

		yield* pasteIntoXToolStudio(
			newProjectTarget,
			bounds,
			secondPasteOffsets,
			tasks,
			paths.pasteSecond,
		);

		yield* tasks.patchTask(paths.root, {
			state: "success",
			label: `${config.label} solder mask imported successfully.`,
			status: "",
		});
	},
);
