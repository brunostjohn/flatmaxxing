export type Side = "front" | "back";

export type Range = {
	readonly min: number;
	readonly max: number;
};

export type OutputPaths = {
	readonly additionalProjects: string;
	readonly gcode: string;
	readonly svg: string;
	readonly dxf: string;
	readonly png: string;
	readonly gerbers: string;
	readonly xtool: string;
	readonly place: string;
};

export type XToolRuntimeOptions = {
	readonly appPath: string;
	readonly cdpHost: string;
	readonly cdpPort: number;
	readonly window: {
		readonly width: number;
		readonly height: number;
	};
};

export type SolderMaskXToolOptions = {
	readonly device: "M1 Ultra";
	readonly intensity: number;
	readonly passes: number;
};

export type StencilXToolOptions = {
	readonly device: "F1 Ultra";
	readonly power: number;
	readonly speed: number;
	readonly passes: number;
};

export type ResolvedConfig = {
	readonly dependencies: {
		readonly kicadCli?: string | undefined;
		readonly docker?: string | undefined;
	};
	readonly paths: OutputPaths;
	readonly board: {
		readonly autoFix: boolean;
		readonly file?: string | undefined;
		readonly ignoreSide: Side | null;
	};
	readonly alignmentDrills: {
		readonly generate: boolean;
		readonly distance: { readonly x: number; readonly y: number };
	};
	readonly electroplating: {
		readonly generateEdgeCutsWithAlignmentDrills: boolean;
		readonly additionalDistance: {
			readonly left: number;
			readonly right: number;
			readonly top: number;
			readonly bottom: number;
		};
	};
	readonly solderMask: {
		readonly generate: boolean;
		readonly double: boolean;
		readonly excludeSides: readonly Side[];
		readonly distance: { readonly x: number; readonly y: number };
		readonly xtool: SolderMaskXToolOptions;
	};
	readonly stencil: {
		readonly generate: boolean;
		readonly excludeSides: readonly Side[];
		readonly xtool: StencilXToolOptions;
	};
	readonly drills: {
		readonly generate: boolean;
		readonly withEdgeCuts: boolean;
	};
	readonly place: {
		readonly generate: boolean;
	};
	readonly cnc: {
		readonly isolation: CncSettingOptions;
		readonly nonCopperClearing: CncSettingOptions;
		readonly availableDrills: readonly CncDrillOptions[];
		readonly availableMills: readonly CncMillBitOptions[];
	};
	readonly xtool: XToolRuntimeOptions & {
		readonly existingProcess: "prompt";
	};
	readonly validation: {
		readonly ranges: {
			readonly distanceMm: Range;
			readonly toolDiameterMm: Range;
			readonly feedRate: Range;
			readonly spindleSpeed: Range;
			readonly cutDepthMm: Range;
			readonly angleDegrees: Range;
			readonly xtoolPercent: Range;
			readonly xtoolPasses: Range;
			readonly xtoolSpeed: Range;
		};
	};
};

export type CncVBitOptions = {
	readonly type: "vbit";
	readonly diameter: number;
	readonly angle: number;
};

export type CncMillBitOptions = {
	readonly type: "mill";
	readonly diameter: number;
};

export type CncDrillOptions = {
	readonly type: "drill";
	readonly diameter: number;
};

export type CncToolOptions =
	| CncVBitOptions
	| CncMillBitOptions
	| CncDrillOptions;

export type CncSettingOptions = {
	readonly feedRate: number;
	readonly spindleSpeed: number;
	readonly zCutDepth: number;
	readonly zCutFeedRate: number;
	readonly tool?: CncToolOptions | undefined;
};

export type BoardSelectionOptions = {
	readonly boardFile?: string | undefined;
};

export type BoardValidationOptions = {
	readonly autoFix: boolean;
};

export type KicadOutputOptions = {
	readonly paths: Pick<
		OutputPaths,
		"svg" | "dxf" | "png" | "gerbers" | "place"
	>;
	readonly sides: readonly Side[];
	readonly drills: {
		readonly generate: boolean;
		readonly withEdgeCuts: boolean;
	};
	readonly place: {
		readonly generate: boolean;
	};
	readonly solderMask: {
		readonly generate: boolean;
		readonly sides: readonly Side[];
		readonly skipReason?: string | undefined;
	};
	readonly stencil: {
		readonly generate: boolean;
		readonly sides: readonly Side[];
		readonly skipReason?: string | undefined;
	};
};

export type XToolLifecycleOptions = XToolRuntimeOptions;

export type SolderMaskProjectOptions = {
	readonly enabled: boolean;
	readonly skipReason?: string | undefined;
	readonly sides: readonly Side[];
	readonly sideSkipStatus: Partial<Record<Side, string>>;
	readonly double: boolean;
	readonly distance: { readonly x: number; readonly y: number };
	readonly xtool: SolderMaskXToolOptions;
};

export type SolderPasteStencilOptions = {
	readonly enabled: boolean;
	readonly skipReason?: string | undefined;
	readonly sides: readonly Side[];
	readonly sideSkipStatus: Partial<Record<Side, string>>;
	readonly xtool: StencilXToolOptions;
};

export type XToolProjectOptions = {
	readonly enabled: boolean;
	readonly outputPath: string;
	readonly lifecycle: XToolLifecycleOptions;
	readonly solderMask: SolderMaskProjectOptions;
	readonly stencil: SolderPasteStencilOptions;
};
