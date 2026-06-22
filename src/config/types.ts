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
	readonly drills: string;
	readonly xtool: string;
	readonly place: string;
	/** Where MakeraCAM project files (.mkc) are saved. */
	readonly cnc: string;
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

export type MakeracamRuntimeOptions = {
	readonly appPath: string;
	/** Cut depth (mm) applied to drilling/pocket/contour End Depth. */
	readonly cutDepthMm: number;
	/** Auto-tab count per contour (Tab Layout = "Number"). */
	readonly tabsPerContour: number;
	readonly existingProcess: "prompt";
	readonly window: {
		readonly width: number;
		readonly height: number;
	};
	readonly platedHoles: { readonly generate: boolean };
	readonly finalCut: { readonly generate: boolean };
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
		readonly flatcam?: string | undefined;
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
		readonly diameter: number;
	};
	readonly electroplating: {
		readonly generateEdgeCutsWithAlignmentDrills: boolean;
		readonly additionalDistance: {
			readonly left: number;
			readonly right: number;
			readonly top: number;
			readonly bottom: number;
		};
		readonly cornerRadius: number;
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
		readonly isolation: CncIsolationOptions;
		readonly nonCopperClearing: CncNonCopperClearingOptions;
		readonly clearance: CncClearanceOptions;
		readonly backside: CncBacksideOptions;
		readonly drilling: CncDrillingOptions;
		readonly availableDrills: readonly CncDrillOptions[];
		readonly availableMills: readonly CncMillBitOptions[];
	};
	readonly xtool: XToolRuntimeOptions & {
		readonly existingProcess: "prompt";
	};
	readonly makeracam: MakeracamRuntimeOptions;
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
		readonly isolationFeasibility: IsolationFeasibilityOptions;
		readonly drillFeasibility: DrillFeasibilityOptions;
	};
};

export type DrillFeasibilityOptions = {
	readonly enabled: boolean;
	readonly onFailure: "error" | "warn";
};

export type IsolationFeasibilityOptions = {
	readonly enabled: boolean;
	readonly onFailure: "error" | "warn";
	/**
	 * Regexes matched against each clearance violation's text (its description
	 * plus the features involved). Matching violations are excluded from the
	 * gate — an escape hatch for intentional offenders (e.g. antenna footprints).
	 */
	readonly ignore: readonly string[];
};

export type CncVBitOptions = {
	readonly type: "vbit";
	readonly diameter: number;
	readonly angle: number;
};

export type CncMillBitOptions = {
	readonly type: "mill";
	readonly diameter: number;
	// Optional per-tool NCC overrides; each falls back to cnc.nonCopperClearing.
	readonly feedRate?: number | undefined;
	readonly zCutFeedRate?: number | undefined;
	readonly spindleSpeed?: number | undefined;
	/** Cut depth for this mill; falls back to nonCopperClearing.millZCutDepth. */
	readonly zCutDepth?: number | undefined;
};

export type CncDrillOptions = {
	readonly type: "drill";
	readonly diameter: number;
};

export type CncDrillingOptions = {
	/**
	 * How far above a hole's true diameter an available drill bit may be and
	 * still be used (rounding up — never undersize). A hole with no bit in
	 * `[D, D + matchToleranceMm]` falls back to a pocket (largest cornmill ≤ D).
	 */
	readonly matchToleranceMm: number;
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

export type IsoType = 0 | 1 | 2;

export type NccMethod = "standard" | "seed" | "lines";

export type CncIsolationOptions = CncSettingOptions & {
	/** Number of overlapping isolation passes around each trace. */
	readonly passes: number;
	/** Percentage [0,99.99] of tool diameter to overlap between passes. */
	readonly overlap: number;
	/** 0 = exteriors, 1 = interiors, 2 = full isolation. */
	readonly isoType: IsoType;
};

export type CncNonCopperClearingOptions = CncSettingOptions & {
	/** Percentage [0,99.99] of tool diameter to overlap between passes. */
	readonly overlap: number;
	/** Bounding-box margin around the cleared area. */
	readonly margin: number;
	/** Clearing pattern. */
	readonly method: NccMethod;
	/** Cut depth for the (corn) mills; deeper than zCutDepth (the V-bit depth). */
	readonly millZCutDepth: number;
};

export type CncClearanceOptions = {
	/** Travel/clearance height between cuts. */
	readonly travelZ: number;
	/** Park height at job end. */
	readonly endZ: number;
	/** Rapid (G0) feedrate. */
	readonly rapidFeedRate: number;
	/** Retract height inserted at the seam between merged operations/tools. */
	readonly seamZ: number;
};

export type CncBacksideOptions = {
	/** Axis to mirror the back copper across before machining. */
	readonly mirrorAxis: "X" | "Y";
};

export type BoardSelectionOptions = {
	readonly boardFile?: string | undefined;
};

export type BoardValidationOptions = {
	readonly autoFix: boolean;
};

export type IsolationValidationOptions = {
	readonly enabled: boolean;
	readonly onFailure: "error" | "warn";
	/** The isolation tool, kept for human-readable diagnostics. */
	readonly tool?: CncToolOptions | undefined;
	readonly cutDepth: number;
	/** Effective cutting width the tool produces at `cutDepth`. */
	readonly effectiveDiameter: number;
	/** KiCad copper layers to validate (e.g. ["F.Cu", "B.Cu"]). */
	readonly layers: readonly string[];
	/** Regexes; clearance violations whose text matches any are ignored. */
	readonly ignorePatterns: readonly string[];
};

export type DrillCategorizationOptions = {
	readonly enabled: boolean;
	readonly onFailure: "error" | "warn";
	/** Where the categorized per-(plating × method × tool) `.drl` files are written. */
	readonly drillsDir: string;
	/** Directory holding KiCad's exported drill files. */
	readonly gerbersDir: string;
	/** Drill bits on hand (for exact / round-up matching). */
	readonly availableDrills: readonly CncDrillOptions[];
	/** Cornmills on hand (for pocketing holes/slots no drill fits). */
	readonly availableMills: readonly CncMillBitOptions[];
	/** Oversize allowance for drilling (see CncDrillingOptions). */
	readonly matchToleranceMm: number;
};

export type AlignmentDrillCategorizationOptions = {
	/** Whether alignment drills are generated at all (alignmentDrills.generate). */
	readonly enabled: boolean;
	readonly drillsDir: string;
	readonly gerbersDir: string;
	readonly availableDrills: readonly CncDrillOptions[];
	readonly availableMills: readonly CncMillBitOptions[];
	readonly matchToleranceMm: number;
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
