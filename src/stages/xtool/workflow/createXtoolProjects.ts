import { createTasklist } from "@/inkHelpers";
import { Effect, FileSystem } from "effect";
import { resolve } from "node:path";
import { xToolTaskPaths, xToolTasks } from "../tasks";
import { createSolderMaskProject } from "./createSolderMaskProject";

export const createXtoolProjects = Effect.fn("flatmaxx.createXtoolProjects")(
	function* (
		projectPath: string,
		pcbName: string,
		offsetSecondToTheRightBy: number,
		offsetBackToTheBottomBy: number,
	) {
		const fs = yield* FileSystem.FileSystem;
		const tasks = yield* createTasklist(
			xToolTasks,
			"Step 2: Create xTool projects",
		);
		const xtoolProjectPath = resolve(projectPath, "xtool");

		if (!(yield* fs.exists(xtoolProjectPath))) {
			yield* tasks.runTask({
				path: xToolTaskPaths.outputFolder,
				effect: fs.makeDirectory(xtoolProjectPath, { recursive: true }),
				loading: { status: `Creating ${xtoolProjectPath}...` },
				success: { label: "xTool folder created." },
				error: { label: "Failed to create xTool folder." },
			});
		} else {
			yield* tasks.patchTask(xToolTaskPaths.outputFolder, {
				state: "success",
				label: "xTool folder already exists.",
			});
		}

		yield* createSolderMaskProject(
			xtoolProjectPath,
			pcbName,
			tasks,
			offsetSecondToTheRightBy,
			offsetBackToTheBottomBy,
		).pipe(
			Effect.tapError((error) =>
				tasks.patchTask(xToolTaskPaths.project, {
					state: "error",
					label: "Failed to create solder mask project.",
					output: error instanceof Error ? error.message : String(error),
				}),
			),
		);
	},
	Effect.scoped,
);
