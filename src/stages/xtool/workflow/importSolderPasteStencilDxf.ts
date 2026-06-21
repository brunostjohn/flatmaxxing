import { runAppleScript } from "@/utils";
import type { Client } from "chrome-remote-interface";
import { Effect } from "effect";
import { applescriptCopyFileReferenceToClipboard } from "../scripts";
import { getSolderPasteStencilDxfPath } from "./getSolderPasteStencilDxfPath";
import { pasteDxfIntoXToolStudio } from "./pasteDxfIntoXToolStudio";
import { solderPasteStencilSideConfig } from "./solderPasteStencilSideConfig";
import type { SolderPasteStencilSide, XToolTasks } from "./types";

export const importSolderPasteStencilDxf = Effect.fn(
	"flatmaxx.xtool.importSolderPasteStencilDxf",
)(function* (
	projectPath: string,
	pcbName: string,
	side: SolderPasteStencilSide,
	newProjectTarget: Client,
	tasks: XToolTasks,
) {
	const config = solderPasteStencilSideConfig[side];
	const paths = config.taskPaths.importDxf;
	const dxfPath = getSolderPasteStencilDxfPath(projectPath, pcbName, side);

	yield* tasks.patchTask(paths.root, {
		state: "loading",
		status: `Preparing ${config.fileSuffix} DXF...`,
	});

	yield* tasks.runTask({
		path: paths.copyDxf,
		effect: runAppleScript(applescriptCopyFileReferenceToClipboard(dxfPath)),
		loading: { status: `Copying ${dxfPath} as a Finder file reference...` },
		success: { label: `${config.fileSuffix} DXF copied to clipboard.` },
	});

	yield* pasteDxfIntoXToolStudio(
		{ Runtime: newProjectTarget.Runtime, Input: newProjectTarget.Input },
		tasks,
		paths,
	);

	yield* tasks.patchTask(paths.root, {
		state: "success",
		label: `${config.label} paste DXF imported successfully.`,
		status: "",
	});
});
