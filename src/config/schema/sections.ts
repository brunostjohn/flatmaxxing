import { Effect, Schema } from "effect";
import {
  defaultAlignmentDrillDistance,
  defaultAlignmentDrills,
  defaultAvailableDrills,
  defaultAvailableMills,
  defaultBoard,
  defaultCncBackside,
  defaultCncClearance,
  defaultCncDrilling,
  defaultCncDrillTool,
  defaultCncIsolation,
  defaultCncMillTool,
  defaultCncNonCopperClearing,
  defaultCncVBitTool,
  defaultDependencies,
  defaultDrillFeasibility,
  defaultDrills,
  defaultElectroplating,
  defaultElectroplatingAdditionalDistance,
  defaultIsolationFeasibility,
  defaultPaths,
  defaultPlace,
  defaultSolderMask,
  defaultSolderMaskDistance,
  defaultSolderMaskXTool,
  defaultStencil,
  defaultStencilXTool,
  defaultValidation,
  defaultValidationRanges,
  defaultMakeracam,
  defaultMakeracamWindow,
  defaultXTool,
  defaultXToolWindow,
} from "./defaults";
import {
  DistanceSchema,
  EdgeDistanceSchema,
  RangeSchema,
  SideSchema,
  WindowSchema,
} from "./primitives";

export const DependenciesSchema = Schema.Struct({
  kicadCli: Schema.String.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultDependencies.kicadCli)),
  ),
  flatcam: Schema.String.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultDependencies.flatcam)),
  ),
  docker: Schema.String.pipe(Schema.optional),
});

export const PathsSchema = Schema.Struct({
  additionalProjects: Schema.String.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultPaths.additionalProjects)),
  ),
  gcode: Schema.String.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultPaths.gcode)),
  ),
  svg: Schema.String.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultPaths.svg)),
  ),
  dxf: Schema.String.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultPaths.dxf)),
  ),
  png: Schema.String.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultPaths.png)),
  ),
  gerbers: Schema.String.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultPaths.gerbers)),
  ),
  drills: Schema.String.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultPaths.drills)),
  ),
  xtool: Schema.String.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultPaths.xtool)),
  ),
  place: Schema.String.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultPaths.place)),
  ),
  cnc: Schema.String.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultPaths.cnc)),
  ),
});

export const XToolSchema = Schema.Struct({
  appPath: Schema.String.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultXTool.appPath)),
  ),
  cdpHost: Schema.String.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultXTool.cdpHost)),
  ),
  cdpPort: Schema.Number.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultXTool.cdpPort)),
  ),
  window: WindowSchema.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultXToolWindow)),
  ),
  existingProcess: Schema.Literals(["prompt"]).pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultXTool.existingProcess)),
  ),
});

export const MakeracamStepSchema = Schema.Struct({
  generate: Schema.Boolean.pipe(
    Schema.withDecodingDefault(Effect.succeed(true)),
  ),
});

export const MakeracamSchema = Schema.Struct({
  appPath: Schema.String.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultMakeracam.appPath)),
  ),
  cutDepthMm: Schema.Number.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultMakeracam.cutDepthMm)),
  ),
  tabsPerContour: Schema.Number.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultMakeracam.tabsPerContour)),
  ),
  existingProcess: Schema.Literals(["prompt"]).pipe(
    Schema.withDecodingDefault(
      Effect.succeed(defaultMakeracam.existingProcess),
    ),
  ),
  window: WindowSchema.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultMakeracamWindow)),
  ),
  platedHoles: MakeracamStepSchema.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultMakeracam.platedHoles)),
  ),
  finalCut: MakeracamStepSchema.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultMakeracam.finalCut)),
  ),
});

export const SolderMaskXToolSchema = Schema.Struct({
  device: Schema.Literal("M1 Ultra").pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultSolderMaskXTool.device)),
  ),
  intensity: Schema.Number.pipe(
    Schema.withDecodingDefault(
      Effect.succeed(defaultSolderMaskXTool.intensity),
    ),
  ),
  passes: Schema.Number.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultSolderMaskXTool.passes)),
  ),
});

export const StencilXToolSchema = Schema.Struct({
  device: Schema.Literal("F1 Ultra").pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultStencilXTool.device)),
  ),
  power: Schema.Number.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultStencilXTool.power)),
  ),
  speed: Schema.Number.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultStencilXTool.speed)),
  ),
  passes: Schema.Number.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultStencilXTool.passes)),
  ),
});

export const AlignmentDrillsSchema = Schema.Struct({
  generate: Schema.Boolean.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultAlignmentDrills.generate)),
  ),
  distance: DistanceSchema.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultAlignmentDrillDistance)),
  ),
  diameter: Schema.Number.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultAlignmentDrills.diameter)),
  ),
});

export const ElectroplatingSchema = Schema.Struct({
  generateEdgeCutsWithAlignmentDrills: Schema.Boolean.pipe(
    Schema.withDecodingDefault(
      Effect.succeed(defaultElectroplating.generateEdgeCutsWithAlignmentDrills),
    ),
  ),
  additionalDistance: EdgeDistanceSchema.pipe(
    Schema.withDecodingDefault(
      Effect.succeed(defaultElectroplatingAdditionalDistance),
    ),
  ),
  cornerRadius: Schema.Number.pipe(
    Schema.withDecodingDefault(
      Effect.succeed(defaultElectroplating.cornerRadius),
    ),
  ),
});

export const BoardSchema = Schema.Struct({
  autoFix: Schema.Boolean.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultBoard.autoFix)),
  ),
  file: Schema.String.pipe(Schema.optional),
  ignoreSide: SideSchema.pipe(
    Schema.NullOr,
    Schema.withDecodingDefault(Effect.succeed(defaultBoard.ignoreSide)),
  ),
});

export const SolderMaskSchema = Schema.Struct({
  generate: Schema.Boolean.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultSolderMask.generate)),
  ),
  double: Schema.Boolean.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultSolderMask.double)),
  ),
  excludeSides: Schema.Array(SideSchema).pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultSolderMask.excludeSides)),
  ),
  distance: DistanceSchema.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultSolderMaskDistance)),
  ),
  xtool: SolderMaskXToolSchema.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultSolderMaskXTool)),
  ),
});

export const StencilSchema = Schema.Struct({
  generate: Schema.Boolean.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultStencil.generate)),
  ),
  excludeSides: Schema.Array(SideSchema).pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultStencil.excludeSides)),
  ),
  xtool: StencilXToolSchema.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultStencilXTool)),
  ),
});

export const DrillsSchema = Schema.Struct({
  generate: Schema.Boolean.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultDrills.generate)),
  ),
  withEdgeCuts: Schema.Boolean.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultDrills.withEdgeCuts)),
  ),
});

export const PlaceSchema = Schema.Struct({
  generate: Schema.Boolean.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultPlace.generate)),
  ),
});

export const CncVBitSchema = Schema.Struct({
  type: Schema.Literal("vbit").pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultCncVBitTool.type)),
  ),
  diameter: Schema.Number.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultCncVBitTool.diameter)),
  ),
  angle: Schema.Number.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultCncVBitTool.angle)),
  ),
});

export const CncMillBitSchema = Schema.Struct({
  type: Schema.Literal("mill").pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultCncMillTool.type)),
  ),
  diameter: Schema.Number.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultCncMillTool.diameter)),
  ),
  // Optional per-tool NCC overrides (fall back to cnc.nonCopperClearing).
  feedRate: Schema.Number.pipe(Schema.optional),
  zCutFeedRate: Schema.Number.pipe(Schema.optional),
  spindleSpeed: Schema.Number.pipe(Schema.optional),
  zCutDepth: Schema.Number.pipe(Schema.optional),
});

export const CncDrillSchema = Schema.Struct({
  type: Schema.Literal("drill").pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultCncDrillTool.type)),
  ),
  diameter: Schema.Number.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultCncDrillTool.diameter)),
  ),
});

export const CncToolSchema = Schema.Union([
  CncVBitSchema,
  CncMillBitSchema,
  CncDrillSchema,
]);

export const CncIsolationSchema = Schema.Struct({
  feedRate: Schema.Number.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultCncIsolation.feedRate)),
  ),
  spindleSpeed: Schema.Number.pipe(
    Schema.withDecodingDefault(
      Effect.succeed(defaultCncIsolation.spindleSpeed),
    ),
  ),
  zCutDepth: Schema.Number.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultCncIsolation.zCutDepth)),
  ),
  zCutFeedRate: Schema.Number.pipe(
    Schema.withDecodingDefault(
      Effect.succeed(defaultCncIsolation.zCutFeedRate),
    ),
  ),
  tool: CncToolSchema.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultCncIsolation.tool)),
  ),
  passes: Schema.Number.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultCncIsolation.passes)),
  ),
  overlap: Schema.Number.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultCncIsolation.overlap)),
  ),
  isoType: Schema.Literals([0, 1, 2]).pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultCncIsolation.isoType)),
  ),
});

export const CncNonCopperClearingSchema = Schema.Struct({
  feedRate: Schema.Number.pipe(
    Schema.withDecodingDefault(
      Effect.succeed(defaultCncNonCopperClearing.feedRate),
    ),
  ),
  spindleSpeed: Schema.Number.pipe(
    Schema.withDecodingDefault(
      Effect.succeed(defaultCncNonCopperClearing.spindleSpeed),
    ),
  ),
  zCutDepth: Schema.Number.pipe(
    Schema.withDecodingDefault(
      Effect.succeed(defaultCncNonCopperClearing.zCutDepth),
    ),
  ),
  zCutFeedRate: Schema.Number.pipe(
    Schema.withDecodingDefault(
      Effect.succeed(defaultCncNonCopperClearing.zCutFeedRate),
    ),
  ),
  tool: CncToolSchema.pipe(
    Schema.withDecodingDefault(
      Effect.succeed(defaultCncNonCopperClearing.tool),
    ),
  ),
  overlap: Schema.Number.pipe(
    Schema.withDecodingDefault(
      Effect.succeed(defaultCncNonCopperClearing.overlap),
    ),
  ),
  margin: Schema.Number.pipe(
    Schema.withDecodingDefault(
      Effect.succeed(defaultCncNonCopperClearing.margin),
    ),
  ),
  method: Schema.Literals(["standard", "seed", "lines"]).pipe(
    Schema.withDecodingDefault(
      Effect.succeed(defaultCncNonCopperClearing.method),
    ),
  ),
  millZCutDepth: Schema.Number.pipe(
    Schema.withDecodingDefault(
      Effect.succeed(defaultCncNonCopperClearing.millZCutDepth),
    ),
  ),
});

export const CncClearanceSchema = Schema.Struct({
  travelZ: Schema.Number.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultCncClearance.travelZ)),
  ),
  endZ: Schema.Number.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultCncClearance.endZ)),
  ),
  rapidFeedRate: Schema.Number.pipe(
    Schema.withDecodingDefault(
      Effect.succeed(defaultCncClearance.rapidFeedRate),
    ),
  ),
  seamZ: Schema.Number.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultCncClearance.seamZ)),
  ),
});

export const CncBacksideSchema = Schema.Struct({
  mirrorAxis: Schema.Literals(["X", "Y"]).pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultCncBackside.mirrorAxis)),
  ),
});

export const CncDrillingSchema = Schema.Struct({
  matchToleranceMm: Schema.Number.pipe(
    Schema.withDecodingDefault(
      Effect.succeed(defaultCncDrilling.matchToleranceMm),
    ),
  ),
});

export const CncSchema = Schema.Struct({
  isolation: CncIsolationSchema.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultCncIsolation)),
  ),
  nonCopperClearing: CncNonCopperClearingSchema.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultCncNonCopperClearing)),
  ),
  clearance: CncClearanceSchema.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultCncClearance)),
  ),
  backside: CncBacksideSchema.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultCncBackside)),
  ),
  drilling: CncDrillingSchema.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultCncDrilling)),
  ),
  availableDrills: Schema.Array(CncDrillSchema).pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultAvailableDrills)),
  ),
  availableMills: Schema.Array(CncMillBitSchema).pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultAvailableMills)),
  ),
});

export const ValidationRangesSchema = Schema.Struct({
  distanceMm: RangeSchema.pipe(
    Schema.withDecodingDefault(
      Effect.succeed(defaultValidationRanges.distanceMm),
    ),
  ),
  toolDiameterMm: RangeSchema.pipe(
    Schema.withDecodingDefault(
      Effect.succeed(defaultValidationRanges.toolDiameterMm),
    ),
  ),
  feedRate: RangeSchema.pipe(
    Schema.withDecodingDefault(
      Effect.succeed(defaultValidationRanges.feedRate),
    ),
  ),
  spindleSpeed: RangeSchema.pipe(
    Schema.withDecodingDefault(
      Effect.succeed(defaultValidationRanges.spindleSpeed),
    ),
  ),
  cutDepthMm: RangeSchema.pipe(
    Schema.withDecodingDefault(
      Effect.succeed(defaultValidationRanges.cutDepthMm),
    ),
  ),
  angleDegrees: RangeSchema.pipe(
    Schema.withDecodingDefault(
      Effect.succeed(defaultValidationRanges.angleDegrees),
    ),
  ),
  xtoolPercent: RangeSchema.pipe(
    Schema.withDecodingDefault(
      Effect.succeed(defaultValidationRanges.xtoolPercent),
    ),
  ),
  xtoolPasses: RangeSchema.pipe(
    Schema.withDecodingDefault(
      Effect.succeed(defaultValidationRanges.xtoolPasses),
    ),
  ),
  xtoolSpeed: RangeSchema.pipe(
    Schema.withDecodingDefault(
      Effect.succeed(defaultValidationRanges.xtoolSpeed),
    ),
  ),
});

export const IsolationFeasibilitySchema = Schema.Struct({
  enabled: Schema.Boolean.pipe(
    Schema.withDecodingDefault(
      Effect.succeed(defaultIsolationFeasibility.enabled),
    ),
  ),
  onFailure: Schema.Literals(["error", "warn"]).pipe(
    Schema.withDecodingDefault(
      Effect.succeed(defaultIsolationFeasibility.onFailure),
    ),
  ),
  ignore: Schema.Array(Schema.String).pipe(
    Schema.withDecodingDefault(
      Effect.succeed(defaultIsolationFeasibility.ignore),
    ),
  ),
});

export const DrillFeasibilitySchema = Schema.Struct({
  enabled: Schema.Boolean.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultDrillFeasibility.enabled)),
  ),
  onFailure: Schema.Literals(["error", "warn"]).pipe(
    Schema.withDecodingDefault(
      Effect.succeed(defaultDrillFeasibility.onFailure),
    ),
  ),
});

export const ValidationSchema = Schema.Struct({
  ranges: ValidationRangesSchema.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultValidation.ranges)),
  ),
  isolationFeasibility: IsolationFeasibilitySchema.pipe(
    Schema.withDecodingDefault(
      Effect.succeed(defaultValidation.isolationFeasibility),
    ),
  ),
  drillFeasibility: DrillFeasibilitySchema.pipe(
    Schema.withDecodingDefault(
      Effect.succeed(defaultValidation.drillFeasibility),
    ),
  ),
});
