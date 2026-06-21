import type {
	CncDrillOptions,
	CncMillBitOptions,
	CncSettingOptions,
	Range,
	Side,
} from "../types";

export const defaultKicadCli =
	"/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli";

export const defaultDependencies = {
	kicadCli: defaultKicadCli,
	docker: undefined,
};

export const defaultPaths = {
	additionalProjects: "./manufacture",
	gcode: "./gcode",
	svg: "./svg",
	dxf: "./dxf",
	png: "./png",
	gerbers: "./gerbers",
	xtool: "./xtool",
	place: "./place",
};

export const defaultBoard = {
	autoFix: false,
	file: undefined,
	ignoreSide: null,
} satisfies {
	autoFix: boolean;
	file?: string | undefined;
	ignoreSide: Side | null;
};

export const defaultDistance = { x: 0, y: 0 };
export const defaultAlignmentDrillDistance = { x: 6, y: 6 };
export const defaultSolderMaskDistance = { x: 6, y: 6 };

export const defaultElectroplatingAdditionalDistance = {
	left: 16,
	right: 4,
	top: 4,
	bottom: 4,
};

export const defaultXToolWindow = {
	width: 1280,
	height: 720,
};

export const defaultXTool = {
	appPath: "/Applications/xTool Studio.app",
	cdpHost: "127.0.0.1",
	cdpPort: 9333,
	window: defaultXToolWindow,
	existingProcess: "prompt" as const,
};

export const defaultSolderMaskXTool = {
	device: "M1 Ultra" as const,
	intensity: 100,
	passes: 3,
};

export const defaultStencilXTool = {
	device: "F1 Ultra" as const,
	power: 100,
	speed: 6000,
	passes: 3,
};

export const defaultAlignmentDrills = {
	generate: true,
	distance: defaultAlignmentDrillDistance,
};

export const defaultElectroplating = {
	generateEdgeCutsWithAlignmentDrills: true,
	additionalDistance: defaultElectroplatingAdditionalDistance,
};

export const defaultSolderMask = {
	generate: true,
	double: true,
	excludeSides: [] as Side[],
	distance: defaultSolderMaskDistance,
	xtool: defaultSolderMaskXTool,
};

export const defaultStencil = {
	generate: true,
	excludeSides: [] as Side[],
	xtool: defaultStencilXTool,
};

export const defaultDrills = {
	generate: true,
	// This currently only annotates downstream handling; KiCad drill generation
	// is unchanged by the flag.
	withEdgeCuts: false,
};

export const defaultPlace = {
	generate: true,
};

export const defaultCncVBitTool = {
	type: "vbit" as const,
	diameter: 0.14,
	angle: 60,
};

export const defaultCncMillTool = {
	type: "mill" as const,
	diameter: 1,
};

export const defaultCncDrillTool = {
	type: "drill" as const,
	diameter: 1,
};

export const defaultCncSetting = {
	feedRate: 400,
	spindleSpeed: 15000,
	zCutDepth: 0.05,
	zCutFeedRate: 200,
	tool: defaultCncVBitTool,
} satisfies CncSettingOptions;

export const defaultAvailableDrills = [
	{ type: "drill", diameter: 0.3 },
	{ type: "drill", diameter: 0.5 },
	{ type: "drill", diameter: 0.7 },
	{ type: "drill", diameter: 0.8 },
	{ type: "drill", diameter: 1.0 },
	{ type: "drill", diameter: 1.1 },
	{ type: "drill", diameter: 1.2 },
] satisfies CncDrillOptions[];

export const defaultAvailableMills = [
	{ type: "mill", diameter: 0.7 },
	{ type: "mill", diameter: 0.8 },
	{ type: "mill", diameter: 1.0 },
	{ type: "mill", diameter: 1.1 },
	{ type: "mill", diameter: 1.2 },
	{ type: "mill", diameter: 1.3 },
	{ type: "mill", diameter: 1.4 },
	{ type: "mill", diameter: 1.5 },
] satisfies CncMillBitOptions[];

export const defaultCnc = {
	isolation: defaultCncSetting,
	nonCopperClearing: defaultCncSetting,
	availableDrills: defaultAvailableDrills,
	availableMills: defaultAvailableMills,
};

export const defaultRange = {
	min: 0,
	max: Number.MAX_SAFE_INTEGER,
} satisfies Range;

export const defaultValidationRanges = {
	distanceMm: { min: 0, max: 250 },
	toolDiameterMm: { min: 0.01, max: 10 },
	feedRate: { min: 1, max: 10000 },
	spindleSpeed: { min: 1, max: 50000 },
	cutDepthMm: { min: 0.001, max: 5 },
	angleDegrees: { min: 1, max: 180 },
	xtoolPercent: { min: 0, max: 100 },
	xtoolPasses: { min: 1, max: 20 },
	xtoolSpeed: { min: 1, max: 20000 },
};

export const defaultValidation = {
	ranges: defaultValidationRanges,
};

export const defaultConfigFile = {
	extends: [] as string[],
	dependencies: defaultDependencies,
	paths: defaultPaths,
	board: defaultBoard,
	alignmentDrills: defaultAlignmentDrills,
	electroplating: defaultElectroplating,
	solderMask: defaultSolderMask,
	stencil: defaultStencil,
	drills: defaultDrills,
	place: defaultPlace,
	cnc: defaultCnc,
	xtool: defaultXTool,
	validation: defaultValidation,
};
