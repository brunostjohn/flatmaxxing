export type Side = "front" | "back";

export interface Range {
  readonly min: number;
  readonly max: number;
}

export interface OutputPaths {
  readonly additionalProjects: string;
  readonly gcode: string;
  readonly svg: string;
  readonly dxf: string;
  readonly png: string;
  readonly gerbers: string;
  readonly drills: string;
  readonly xtool: string;
  readonly place: string;
  readonly cnc: string;
}

export interface XToolRuntimeOptions {
  readonly appPath: string;
  readonly cdpHost: string;
  readonly cdpPort: number;
  readonly window: {
    readonly width: number;
    readonly height: number;
  };
}

export interface MakeracamRuntimeOptions {
  readonly appPath: string;
  readonly cutDepthMm: number;
  readonly tabsPerContour: number;
  readonly existingProcess: "prompt";
  readonly window: {
    readonly width: number;
    readonly height: number;
  };
  readonly platedHoles: { readonly generate: boolean };
  readonly finalCut: { readonly generate: boolean };
}

export interface SolderMaskXToolOptions {
  readonly device: "M1 Ultra";
  readonly intensity: number;
  readonly passes: number;
}

export interface StencilXToolOptions {
  readonly device: "F1 Ultra";
  readonly power: number;
  readonly speed: number;
  readonly passes: number;
}

export interface ResolvedConfig {
  readonly projectDir: string;
  readonly skipRenderBoard: boolean;
  readonly dependencies: {
    readonly kicadCli?: string | undefined;
    readonly flatcam?: string | undefined;
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
    readonly container: ElectroplatingContainerOptions;
    readonly recipe: ElectroplatingRecipeOptions;
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
      readonly electroplatingBoardSizeMm: Range;
      readonly electroplatingVolumeMl: Range;
      readonly electroplatingCurrentDensityMaPerCm2: Range;
      readonly electroplatingDurationMinutes: Range;
      readonly electroplatingStirRpm: Range;
      readonly electroplatingMicrons: Range;
      readonly electroplatingVoltageV: Range;
      readonly electroplatingMassGramsPerLiter: Range;
      readonly electroplatingLiquidMillilitersPerLiter: Range;
      readonly electroplatingConcentrationPercent: Range;
    };
    readonly isolationFeasibility: IsolationFeasibilityOptions;
    readonly drillFeasibility: DrillFeasibilityOptions;
  };
}

export interface ElectroplatingOffsets {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

export interface ElectroplatingContainerOptions {
  readonly waterMl: number;
  readonly maxBoardWidthMm?: number | undefined;
  readonly maxBoardHeightMm?: number | undefined;
  readonly allowRotation: boolean;
}

export interface ElectroplatingRecipeOptions {
  readonly currentDensityMaPerCm2: number;
  readonly durationMinutes: number;
  readonly stirRpm: number;
  readonly targetCopperMicrons: number;
  readonly voltageLimitV: number;
  readonly copperSulfatePentahydrate: {
    readonly gramsPerLiter: number;
  };
  readonly citricAcid: {
    readonly gramsPerLiter: number;
  };
  readonly polysorbate20: {
    readonly millilitersPerLiter: number;
  };
  readonly hcl: {
    readonly solutionConcentrationPercent: number;
    readonly referenceConcentrationPercent: number;
    readonly referenceMillilitersPerLiter: number;
  };
}

export interface DrillFeasibilityOptions {
  readonly enabled: boolean;
  readonly onFailure: "error" | "warn";
}

export interface IsolationFeasibilityOptions {
  readonly enabled: boolean;
  readonly onFailure: "error" | "warn";
  readonly ignore: readonly string[];
}

export interface CncVBitOptions {
  readonly type: "vbit";
  readonly diameter: number;
  readonly angle: number;
}

export interface CncMillBitOptions {
  readonly type: "mill";
  readonly diameter: number;
  readonly feedRate?: number | undefined;
  readonly zCutFeedRate?: number | undefined;
  readonly spindleSpeed?: number | undefined;
  readonly zCutDepth?: number | undefined;
}

export interface CncDrillOptions {
  readonly type: "drill";
  readonly diameter: number;
}

export interface CncDrillingOptions {
  readonly matchToleranceMm: number;
}

export type CncToolOptions =
  | CncVBitOptions
  | CncMillBitOptions
  | CncDrillOptions;

export interface CncSettingOptions {
  readonly feedRate: number;
  readonly spindleSpeed: number;
  readonly zCutDepth: number;
  readonly zCutFeedRate: number;
  readonly tool?: CncToolOptions | undefined;
}

export type IsoType = 0 | 1 | 2;

export type NccMethod = "standard" | "seed" | "lines";

export interface CncIsolationOptions extends CncSettingOptions {
  readonly passes: number;
  readonly overlap: number;
  readonly isoType: IsoType;
}

export interface CncNonCopperClearingOptions extends CncSettingOptions {
  readonly overlap: number;
  readonly margin: number;
  readonly method: NccMethod;
  readonly millZCutDepth: number;
}

export interface CncClearanceOptions {
  readonly travelZ: number;
  readonly endZ: number;
  readonly rapidFeedRate: number;
  readonly seamZ: number;
}

export interface CncBacksideOptions {
  readonly mirrorAxis: "X" | "Y";
}

export interface BoardSelectionOptions {
  readonly boardFile?: string | undefined;
}

export interface BoardValidationOptions {
  readonly autoFix: boolean;
  readonly platingBath?: PlatingBathValidationOptions | undefined;
}

export interface PlatingBathValidationOptions {
  readonly maxBoardWidthMm?: number | undefined;
  readonly maxBoardHeightMm?: number | undefined;
  readonly allowRotation: boolean;
  readonly platingOffsets: ElectroplatingOffsets;
  readonly includeAlignmentDrills: boolean;
  readonly alignmentDistance: { readonly x: number; readonly y: number };
}

export interface IsolationValidationOptions {
  readonly enabled: boolean;
  readonly onFailure: "error" | "warn";
  readonly tool?: CncToolOptions | undefined;
  readonly cutDepth: number;
  readonly effectiveDiameter: number;
  readonly layers: readonly string[];
  readonly ignorePatterns: readonly string[];
}

export interface DrillCategorizationOptions {
  readonly enabled: boolean;
  readonly onFailure: "error" | "warn";
  readonly drillsDir: string;
  readonly gerbersDir: string;
  readonly availableDrills: readonly CncDrillOptions[];
  readonly availableMills: readonly CncMillBitOptions[];
  readonly matchToleranceMm: number;
}

export interface AlignmentDrillCategorizationOptions {
  readonly enabled: boolean;
  readonly drillsDir: string;
  readonly gerbersDir: string;
  readonly availableDrills: readonly CncDrillOptions[];
  readonly availableMills: readonly CncMillBitOptions[];
  readonly matchToleranceMm: number;
}

export interface KicadOutputOptions {
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
  readonly boardImage: {
    readonly generate: boolean;
    readonly skipReason?: string | undefined;
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
}

export type XToolLifecycleOptions = XToolRuntimeOptions;

export interface SolderMaskProjectOptions {
  readonly enabled: boolean;
  readonly skipReason?: string | undefined;
  readonly sides: readonly Side[];
  readonly sideSkipStatus: Partial<Record<Side, string>>;
  readonly double: boolean;
  readonly distance: { readonly x: number; readonly y: number };
  readonly xtool: SolderMaskXToolOptions;
}

export interface SolderPasteStencilOptions {
  readonly enabled: boolean;
  readonly skipReason?: string | undefined;
  readonly sides: readonly Side[];
  readonly sideSkipStatus: Partial<Record<Side, string>>;
  readonly xtool: StencilXToolOptions;
}

export interface XToolProjectOptions {
  readonly enabled: boolean;
  readonly outputPath: string;
  readonly lifecycle: XToolLifecycleOptions;
  readonly solderMask: SolderMaskProjectOptions;
  readonly stencil: SolderPasteStencilOptions;
}
