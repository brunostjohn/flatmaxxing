import { Effect, Schema } from "effect";
import {
	defaultAlignmentDrillDistance,
	defaultAlignmentDrills,
	defaultAvailableDrills,
	defaultAvailableMills,
	defaultBoard,
	defaultCncDrillTool,
	defaultCncMillTool,
	defaultCncSetting,
	defaultCncVBitTool,
	defaultDependencies,
	defaultDrills,
	defaultElectroplating,
	defaultElectroplatingAdditionalDistance,
	defaultPaths,
	defaultPlace,
	defaultSolderMask,
	defaultSolderMaskDistance,
	defaultSolderMaskXTool,
	defaultStencil,
	defaultStencilXTool,
	defaultValidation,
	defaultValidationRanges,
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
	xtool: Schema.String.pipe(
		Schema.withDecodingDefault(Effect.succeed(defaultPaths.xtool)),
	),
	place: Schema.String.pipe(
		Schema.withDecodingDefault(Effect.succeed(defaultPaths.place)),
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

export const CncSettingSchema = Schema.Struct({
	feedRate: Schema.Number.pipe(
		Schema.withDecodingDefault(Effect.succeed(defaultCncSetting.feedRate)),
	),
	spindleSpeed: Schema.Number.pipe(
		Schema.withDecodingDefault(Effect.succeed(defaultCncSetting.spindleSpeed)),
	),
	zCutDepth: Schema.Number.pipe(
		Schema.withDecodingDefault(Effect.succeed(defaultCncSetting.zCutDepth)),
	),
	zCutFeedRate: Schema.Number.pipe(
		Schema.withDecodingDefault(Effect.succeed(defaultCncSetting.zCutFeedRate)),
	),
	tool: CncToolSchema.pipe(
		Schema.withDecodingDefault(Effect.succeed(defaultCncSetting.tool)),
	),
});

export const CncSchema = Schema.Struct({
	isolation: CncSettingSchema.pipe(
		Schema.withDecodingDefault(Effect.succeed(defaultCncSetting)),
	),
	nonCopperClearing: CncSettingSchema.pipe(
		Schema.withDecodingDefault(Effect.succeed(defaultCncSetting)),
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

export const ValidationSchema = Schema.Struct({
	ranges: ValidationRangesSchema.pipe(
		Schema.withDecodingDefault(Effect.succeed(defaultValidation.ranges)),
	),
});
