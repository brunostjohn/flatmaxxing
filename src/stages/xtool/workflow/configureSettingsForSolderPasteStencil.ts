import type { Client } from "chrome-remote-interface";
import { Duration, Effect } from "effect";
import { cdpClickOn, runScriptInXToolStudio } from "../cdp";
import { getParameterOverviewItemBox } from "../scripts";
import type {
	RectBounds,
	SolderPasteStencilSettingsTaskPaths,
	XToolTasks,
} from "./types";

export const configureSettingsForSolderPasteStencil = Effect.fn(
	"flatmaxx.xtool.configureSettingsForSolderPasteStencil",
)(function* (
	{ Runtime, Input }: Pick<Client, "Runtime" | "Input">,
	tasks: XToolTasks,
	paths: SolderPasteStencilSettingsTaskPaths,
) {
	yield* tasks.patchTask(paths.root, {
		state: "loading",
		status: "Opening stencil settings without changing values...",
	});

	yield* tasks.runTask({
		path: paths.openParameters,
		effect: Effect.gen(function* () {
			const { x, y, width, height }: RectBounds = yield* runScriptInXToolStudio(
				getParameterOverviewItemBox,
				Runtime,
				true,
			);
			yield* cdpClickOn(x + width / 2, y + height / 2, Input);
			yield* Effect.sleep(Duration.millis(500));
		}),
		loading: { status: "Opening parameter overview item..." },
		success: { label: "Parameter panel opened." },
	});

	yield* tasks.runTask({
		path: paths.skeleton,
		effect: Effect.sync(() => undefined),
		loading: {
			status: "Placeholder: future stencil settings will be verified here.",
		},
		success: { label: "Stencil settings intentionally left unchanged." },
	});

	yield* tasks.patchTask(paths.root, {
		state: "success",
		label: "Stencil settings step completed.",
		status: "",
	});
});
