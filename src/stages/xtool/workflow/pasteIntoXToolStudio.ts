import type { TaskPath } from "@/inkHelpers";
import { runAppleScript } from "@/utils";
import type { Client } from "chrome-remote-interface";
import { Duration, Effect } from "effect";
import { cdpClickOn, cdpTypeIn, runScriptInXToolStudio } from "../cdp";
import {
	applescriptOpenXtoolAndPaste,
	clickScaleToFit,
	getWidthBoundingBox,
	getXBoundingBox,
	getYBoundingBox,
} from "../scripts";
import { clearXToolSelection } from "./clearXToolSelection";
import { getSolderMaskPastePosition } from "./getSolderMaskPastePosition";
import type {
	RectBounds,
	SolderMaskBounds,
	SolderMaskPasteOffsets,
	XToolTasks,
} from "./types";

type PasteTaskPaths = {
	root: TaskPath;
	clearBefore: TaskPath;
	paste: TaskPath;
	scaleToFit: TaskPath;
	setWidth: TaskPath;
	setX: TaskPath;
	setY: TaskPath;
	clearAfter: TaskPath;
};

export const pasteIntoXToolStudio = Effect.fn("flatmaxx.xtool.pasteIntoStudio")(
	function* (
		{ Runtime, Input }: Client,
		bounds: SolderMaskBounds,
		offsets: SolderMaskPasteOffsets,
		tasks: XToolTasks,
		taskPaths: PasteTaskPaths,
	) {
		const { x, y } = getSolderMaskPastePosition(bounds, offsets);

		yield* tasks.patchTask(taskPaths.root, {
			state: "loading",
			status: `Target x=${x}, y=${y}, width=${bounds.width}`,
		});

		yield* tasks.runTask({
			path: taskPaths.clearBefore,
			effect: clearXToolSelection({ Runtime, Input }),
			loading: { status: "Escaping selection and clicking the canvas..." },
			success: { label: "Selection cleared before paste." },
		});

		yield* tasks.runTask({
			path: taskPaths.paste,
			effect: runAppleScript(applescriptOpenXtoolAndPaste),
			loading: { status: "Sending Command+V to xTool Studio..." },
			success: { label: "PNG pasted." },
		});

		yield* tasks.runTask({
			path: taskPaths.scaleToFit,
			effect: runScriptInXToolStudio(clickScaleToFit, Runtime),
			loading: { status: "Clicking Scale to fit..." },
			success: { label: "Scale to fit clicked." },
		});

		yield* Effect.sleep(Duration.millis(500));

		yield* tasks.runTask({
			path: taskPaths.setWidth,
			effect: Effect.gen(function* () {
				const wBox: RectBounds = yield* runScriptInXToolStudio(
					getWidthBoundingBox,
					Runtime,
					true,
				);
				yield* cdpClickOn(
					wBox.x + wBox.width / 2,
					wBox.y + wBox.height / 2,
					Input,
				);
				yield* cdpTypeIn(bounds.width.toString(), Input, true);
			}),
			loading: { status: `Typing width ${bounds.width}...` },
			success: { label: `Width set to ${bounds.width}.` },
		});

		yield* tasks.runTask({
			path: taskPaths.setX,
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
				yield* cdpTypeIn(x.toString(), Input, true);
			}),
			loading: { status: `Typing X ${x}...` },
			success: { label: `X set to ${x}.` },
		});

		yield* tasks.runTask({
			path: taskPaths.setY,
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
				yield* cdpTypeIn(y.toString(), Input, true);
			}),
			loading: { status: `Typing Y ${y}...` },
			success: { label: `Y set to ${y}.` },
		});

		yield* Effect.sleep(Duration.millis(500));

		yield* tasks.runTask({
			path: taskPaths.clearAfter,
			effect: clearXToolSelection({ Runtime, Input }),
			loading: { status: "Clearing positioned mask selection..." },
			success: { label: "Selection cleared after positioning." },
		});

		yield* tasks.patchTask(taskPaths.root, {
			state: "success",
			label: "Mask copy pasted and positioned.",
			status: "",
		});
	},
);
