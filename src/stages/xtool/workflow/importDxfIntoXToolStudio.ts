import { runAppleScript } from "@/utils";
import type { Client } from "chrome-remote-interface";
import { Duration, Effect } from "effect";
import { cdpClickOn, cdpTypeIn, runScriptInXToolStudio } from "../cdp";
import {
	applescriptChooseFileInOpenDialog,
	clickImport,
	getXBoundingBox,
	getYBoundingBox,
} from "../scripts";
import { clearXToolSelection } from "./clearXToolSelection";
import type {
	RectBounds,
	SolderPasteStencilImportTaskPaths,
	XToolTasks,
} from "./types";

export const importDxfIntoXToolStudio = Effect.fn(
	"flatmaxx.xtool.importDxfIntoStudio",
)(function* (
	dxfPath: string,
	{ Runtime, Input }: Pick<Client, "Runtime" | "Input">,
	tasks: XToolTasks,
	paths: SolderPasteStencilImportTaskPaths,
) {
	yield* tasks.patchTask(paths.root, {
		state: "loading",
		status: "Importing DXF and setting x=0, y=0...",
	});

	yield* tasks.runTask({
		path: paths.clearBefore,
		effect: clearXToolSelection({ Runtime, Input }),
		loading: { status: "Escaping selection and clicking the canvas..." },
		success: { label: "Selection cleared before DXF import." },
	});

	yield* tasks.runTask({
		path: paths.openImportMenu,
		effect: runScriptInXToolStudio(clickImport, Runtime),
		loading: { status: "Opening xTool File > Import menu..." },
		success: { label: "Import menu opened." },
	});

	yield* tasks.runTask({
		path: paths.chooseDxfFile,
		effect: runAppleScript(
			applescriptChooseFileInOpenDialog("xTool Studio", dxfPath),
		),
		loading: { status: `Choosing ${dxfPath} in the import dialog...` },
		success: { label: "DXF selected in import dialog." },
	});

	yield* Effect.sleep(Duration.millis(500));

	yield* tasks.runTask({
		path: paths.setX,
		effect: Effect.gen(function* () {
			const xBox: RectBounds = yield* runScriptInXToolStudio(
				getXBoundingBox,
				Runtime,
				true,
			);
			yield* cdpClickOn(
				xBox.x + xBox.width / 2,
				xBox.y + xBox.height / 2,
				Input,
			);
			yield* cdpTypeIn("0", Input, true);
		}),
		loading: { status: "Typing X 0..." },
		success: { label: "X set to 0." },
	});

	yield* tasks.runTask({
		path: paths.setY,
		effect: Effect.gen(function* () {
			const yBox: RectBounds = yield* runScriptInXToolStudio(
				getYBoundingBox,
				Runtime,
				true,
			);
			yield* cdpClickOn(
				yBox.x + yBox.width / 2,
				yBox.y + yBox.height / 2,
				Input,
			);
			yield* cdpTypeIn("0", Input, true);
		}),
		loading: { status: "Typing Y 0..." },
		success: { label: "Y set to 0." },
	});

	yield* Effect.sleep(Duration.millis(500));

	yield* tasks.runTask({
		path: paths.clearAfter,
		effect: clearXToolSelection({ Runtime, Input }),
		loading: { status: "Clearing positioned DXF selection..." },
		success: { label: "Selection cleared after positioning." },
	});

	yield* tasks.patchTask(paths.root, {
		state: "success",
		label: "DXF imported at x=0, y=0.",
		status: "",
	});
});
