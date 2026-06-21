import { Effect } from "effect";
import { xToolTaskPaths } from "../tasks";
import { createSolderPasteStencilProject } from "./createSolderPasteStencilProject";
import type { XToolTasks } from "./types";

export const createSolderPasteStencilProjects = Effect.fn(
	"flatmaxx.xtool.createSolderPasteStencilProjects",
)(function* (desiredAbsolutePath: string, pcbName: string, tasks: XToolTasks) {
	yield* tasks.patchTask(xToolTaskPaths.pasteStencils.root, {
		state: "loading",
		status: "Creating front and back solder paste stencil projects...",
	});

	yield* createSolderPasteStencilProject(
		desiredAbsolutePath,
		pcbName,
		"front",
		tasks,
	).pipe(
		Effect.tapError((error) =>
			tasks.patchTask(xToolTaskPaths.pasteStencils.front.root, {
				state: "error",
				label: "Failed to create front solder paste stencil.",
				output: error instanceof Error ? error.message : String(error),
			}),
		),
	);

	yield* createSolderPasteStencilProject(
		desiredAbsolutePath,
		pcbName,
		"back",
		tasks,
	).pipe(
		Effect.tapError((error) =>
			tasks.patchTask(xToolTaskPaths.pasteStencils.back.root, {
				state: "error",
				label: "Failed to create back solder paste stencil.",
				output: error instanceof Error ? error.message : String(error),
			}),
		),
	);

	yield* tasks.patchTask(xToolTaskPaths.pasteStencils.root, {
		state: "success",
		label: "Solder paste stencil projects handled.",
		status: "",
	});
});
