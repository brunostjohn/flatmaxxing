import type { StencilXToolOptions, XToolLifecycleOptions } from "@/config";
import { Effect } from "effect";
import { configureDeviceForSolderPasteStencil } from "./configureDeviceForSolderPasteStencil";
import { configureSettingsForSolderPasteStencil } from "./configureSettingsForSolderPasteStencil";
import { createNewXtoolProject } from "./createNewXtoolProject";
import { getSolderPasteStencilOutputFilename } from "./getSolderPasteStencilOutputFilename";
import { importSolderPasteStencilDxf } from "./importSolderPasteStencilDxf";
import { saveXtoolProjectAndClose } from "./saveXtoolProjectAndClose";
import { solderPasteStencilSideConfig } from "./solderPasteStencilSideConfig";
import type { SolderPasteStencilSide, XToolTasks } from "./types";
import { validateSolderPasteStencilDxf } from "./validateSolderPasteStencilDxf";

export const createSolderPasteStencilProject = Effect.fn(
	"flatmaxx.xtool.createSolderPasteStencilProject",
)(function* (
	desiredAbsolutePath: string,
	pcbName: string,
	side: SolderPasteStencilSide,
	tasks: XToolTasks,
	settings: StencilXToolOptions = {
		device: "F1 Ultra",
		power: 100,
		speed: 6000,
		passes: 3,
	},
	lifecycleOptions?: XToolLifecycleOptions,
) {
	const config = solderPasteStencilSideConfig[side];
	const paths = config.taskPaths;
	const outputFilename = getSolderPasteStencilOutputFilename(pcbName, side);

	yield* tasks.patchTask(paths.root, {
		state: "loading",
		status: `Creating ${config.label} solder paste stencil project...`,
	});

	const hasPlottableGeometry = yield* validateSolderPasteStencilDxf(
		desiredAbsolutePath,
		pcbName,
		side,
		tasks,
	);

	if (!hasPlottableGeometry) {
		yield* tasks.patchTask(paths.root, {
			state: "success",
			label: `${config.label} solder paste stencil skipped.`,
			status: `${config.fileSuffix} DXF has no plottable objects.`,
		});
		return true;
	}

	const newProjectTarget = yield* createNewXtoolProject(
		tasks,
		paths.cdp,
		lifecycleOptions,
	);

	yield* configureDeviceForSolderPasteStencil(
		newProjectTarget,
		tasks,
		{
			...paths.device,
			selectDevice: paths.device.selectF1Ultra,
		},
		lifecycleOptions,
	);

	yield* importSolderPasteStencilDxf(
		desiredAbsolutePath,
		pcbName,
		side,
		newProjectTarget,
		tasks,
	);

	yield* configureSettingsForSolderPasteStencil(
		{ Runtime: newProjectTarget.Runtime, Input: newProjectTarget.Input },
		tasks,
		paths.settings,
		settings,
	);

	yield* saveXtoolProjectAndClose(
		desiredAbsolutePath,
		outputFilename,
		newProjectTarget,
		tasks,
		paths.save,
	);

	yield* tasks.patchTask(paths.root, {
		state: "success",
		label: `${config.label} solder paste stencil project created.`,
		status: outputFilename,
	});

	return true;
});
