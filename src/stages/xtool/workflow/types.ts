import type { TaskPath, TaskScope } from "@/inkHelpers";

export type RectBounds = {
	x: number;
	y: number;
	width: number;
	height: number;
};

export type SolderMaskBounds = { width: number; height: number };

export type SolderMaskPasteOffsets = {
	right?: number;
	bottom?: number;
};

export type SolderMaskSide = "front" | "back";

export type SolderPasteStencilSide = "front" | "back";

export type CreateProjectTaskPaths = {
	root: TaskPath;
	listTargets: TaskPath;
	connectShell: TaskPath;
	createEditorProject: TaskPath;
	connectEditor: TaskPath;
	waitForEditorReady: TaskPath;
};

export type DeviceSelectionTaskPaths = {
	root: TaskPath;
	switchDevice: TaskPath;
	openDeviceLibrary: TaskPath;
	selectDevice: TaskPath;
	confirmSwitch: TaskPath;
	setWindowSize: TaskPath;
};

export type SaveProjectTaskPaths = {
	root: TaskPath;
	removeExisting: TaskPath;
	openSaveAs: TaskPath;
	clickSaveLocally: TaskPath;
	focusDialog: TaskPath;
	savePath: TaskPath;
};

export type SolderPasteStencilImportTaskPaths = {
	root: TaskPath;
	validateDxf: TaskPath;
	copyDxf: TaskPath;
	clearBefore: TaskPath;
	paste: TaskPath;
	setX: TaskPath;
	setY: TaskPath;
	clearAfter: TaskPath;
};

export type SolderPasteStencilSettingsTaskPaths = {
	root: TaskPath;
	openParameters: TaskPath;
	selectCut: TaskPath;
	openLaserType: TaskPath;
	selectFiberLaser: TaskPath;
	setPower: TaskPath;
	setSpeed: TaskPath;
	setPasses: TaskPath;
};

export type XToolTasks = TaskScope;
