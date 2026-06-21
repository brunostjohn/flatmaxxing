import type { XToolProjectOptions } from "@/config";
import { createTasklist, markTaskBranch } from "@/inkHelpers";
import { Effect, FileSystem } from "effect";
import { resolve } from "node:path";
import { xToolTaskPaths, xToolTasks } from "../tasks";
import { createSolderMaskProject } from "./createSolderMaskProject";
import { createSolderPasteStencilProjects } from "./createSolderPasteStencilProjects";
import { startXToolStudioLifecycle } from "./startXToolStudioLifecycle";

const defaultXToolProjectOptions: XToolProjectOptions = {
	enabled: true,
	outputPath: "./xtool",
	lifecycle: {
		appPath: "/Applications/xTool Studio.app",
		cdpHost: "127.0.0.1",
		cdpPort: 9333,
		window: {
			width: 1280,
			height: 720,
		},
	},
	solderMask: {
		enabled: true,
		sides: ["front", "back"],
		sideSkipStatus: {},
		double: true,
		distance: { x: 10, y: 10 },
		xtool: {
			device: "M1 Ultra",
			intensity: 100,
			passes: 3,
		},
	},
	stencil: {
		enabled: true,
		sides: ["front", "back"],
		sideSkipStatus: {},
		xtool: {
			device: "F1 Ultra",
			power: 100,
			speed: 6000,
			passes: 3,
		},
	},
};

export const createXtoolProjects = Effect.fn("flatmaxx.createXtoolProjects")(
	function* (
		projectPath: string,
		pcbName: string,
		options: XToolProjectOptions = defaultXToolProjectOptions,
	) {
		const fs = yield* FileSystem.FileSystem;
		const tasks = yield* createTasklist(
			xToolTasks,
			"Step 5: Create xTool projects",
		);

		if (!options.enabled) {
			yield* markTaskBranch(tasks, xToolTasks, xToolTaskPaths.lifecycle.root, {
				state: "success",
				label: "xTool Studio startup skipped.",
				status:
					"solder mask and stencil outputs are disabled or fully excluded.",
				childStatus: "xTool disabled.",
			});
			yield* markTaskBranch(tasks, xToolTasks, xToolTaskPaths.outputFolder, {
				state: "success",
				label: "xTool output folder skipped.",
				status: "No xTool outputs enabled.",
			});
			yield* markTaskBranch(tasks, xToolTasks, xToolTaskPaths.project, {
				state: "success",
				label: "Solder mask project skipped.",
				status: options.solderMask.skipReason ?? "solderMask disabled.",
				childStatus: options.solderMask.skipReason ?? "solderMask disabled.",
			});
			yield* markTaskBranch(
				tasks,
				xToolTasks,
				xToolTaskPaths.pasteStencils.root,
				{
					state: "success",
					label: "Solder paste stencil projects skipped.",
					status: options.stencil.skipReason ?? "stencil disabled.",
					childStatus: options.stencil.skipReason ?? "stencil disabled.",
				},
			);
			return;
		}

		const xtoolProjectPath = resolve(projectPath, options.outputPath);

		yield* startXToolStudioLifecycle(
			tasks,
			xToolTaskPaths.lifecycle,
			options.lifecycle,
		).pipe(
			Effect.tapError((error) =>
				tasks.patchTask(xToolTaskPaths.lifecycle.root, {
					state: "error",
					label: "Failed to prepare xTool Studio.",
					output: error instanceof Error ? error.message : String(error),
				}),
			),
		);

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
			options.solderMask,
			options.lifecycle,
		).pipe(
			Effect.tapError((error) =>
				tasks.patchTask(xToolTaskPaths.project, {
					state: "error",
					label: "Failed to create solder mask project.",
					output: error instanceof Error ? error.message : String(error),
				}),
			),
		);

		yield* createSolderPasteStencilProjects(
			xtoolProjectPath,
			pcbName,
			tasks,
			options.stencil,
			options.lifecycle,
		).pipe(
			Effect.tapError((error) =>
				tasks.patchTask(xToolTaskPaths.pasteStencils.root, {
					state: "error",
					label: "Failed to create solder paste stencil projects.",
					output: error instanceof Error ? error.message : String(error),
				}),
			),
		);
	},
	Effect.scoped,
);
