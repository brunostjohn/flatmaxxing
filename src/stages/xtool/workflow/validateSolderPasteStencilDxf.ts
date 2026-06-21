import DxfParser from "dxf-parser";
import { Effect, FileSystem } from "effect";
import { getSolderPasteStencilDxfPath } from "./getSolderPasteStencilDxfPath";
import { hasPlottableDxfGeometry } from "./hasPlottableDxfGeometry";
import { solderPasteStencilSideConfig } from "./solderPasteStencilSideConfig";
import type { SolderPasteStencilSide, XToolTasks } from "./types";

export const validateSolderPasteStencilDxf = Effect.fn(
	"flatmaxx.xtool.validateSolderPasteStencilDxf",
)(function* (
	projectPath: string,
	pcbName: string,
	side: SolderPasteStencilSide,
	tasks: XToolTasks,
) {
	const fs = yield* FileSystem.FileSystem;
	const config = solderPasteStencilSideConfig[side];
	const paths = config.taskPaths.importDxf;
	const dxfPath = getSolderPasteStencilDxfPath(projectPath, pcbName, side);

	yield* tasks.patchTask(paths.root, {
		state: "loading",
		status: `Checking ${config.fileSuffix} DXF before opening xTool...`,
	});

	const hasGeometry = yield* tasks.runTask({
		path: paths.validateDxf,
		effect: Effect.gen(function* () {
			const dxfFile = yield* fs.readFileString(dxfPath);
			const parser = new DxfParser();
			const dxf = parser.parseSync(dxfFile);

			if (!dxf) {
				return yield* Effect.fail(new Error("Failed to parse DXF file."));
			}

			return hasPlottableDxfGeometry(dxf);
		}),
		loading: { status: `Validating ${dxfPath} has plottable geometry...` },
		success: { label: `${config.fileSuffix} DXF checked.` },
		error: { label: `Failed to validate ${config.fileSuffix} DXF.` },
	});

	if (!hasGeometry) {
		yield* tasks.patchTask(paths.validateDxf, {
			state: "success",
			label: `${config.fileSuffix} DXF has no plottable objects; skipping.`,
			status: "",
		});
		yield* tasks.patchTask(paths.root, {
			state: "success",
			label: `${config.label} paste DXF is empty; skipping stencil import.`,
			status: dxfPath,
		});
		return false;
	}

	yield* tasks.patchTask(paths.validateDxf, {
		state: "success",
		label: `${config.fileSuffix} DXF has plottable objects.`,
		status: "",
	});

	return true;
});
