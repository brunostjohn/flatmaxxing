import { Effect, Schema } from "effect";
import { defaultConfigFile } from "./defaults";
import {
	AlignmentDrillsSchema,
	BoardSchema,
	CncSchema,
	DependenciesSchema,
	DrillsSchema,
	ElectroplatingSchema,
	MakeracamSchema,
	PathsSchema,
	PlaceSchema,
	SolderMaskSchema,
	StencilSchema,
	ValidationSchema,
	XToolSchema,
} from "./sections";

export const ConfigFileSchema = Schema.Struct({
	extends: Schema.Array(Schema.String).pipe(
		Schema.withDecodingDefault(Effect.succeed(defaultConfigFile.extends)),
	),
	dependencies: DependenciesSchema.pipe(
		Schema.withDecodingDefault(Effect.succeed(defaultConfigFile.dependencies)),
	),
	paths: PathsSchema.pipe(
		Schema.withDecodingDefault(Effect.succeed(defaultConfigFile.paths)),
	),
	board: BoardSchema.pipe(
		Schema.withDecodingDefault(Effect.succeed(defaultConfigFile.board)),
	),
	alignmentDrills: AlignmentDrillsSchema.pipe(
		Schema.withDecodingDefault(
			Effect.succeed(defaultConfigFile.alignmentDrills),
		),
	),
	electroplating: ElectroplatingSchema.pipe(
		Schema.withDecodingDefault(
			Effect.succeed(defaultConfigFile.electroplating),
		),
	),
	solderMask: SolderMaskSchema.pipe(
		Schema.withDecodingDefault(Effect.succeed(defaultConfigFile.solderMask)),
	),
	stencil: StencilSchema.pipe(
		Schema.withDecodingDefault(Effect.succeed(defaultConfigFile.stencil)),
	),
	drills: DrillsSchema.pipe(
		Schema.withDecodingDefault(Effect.succeed(defaultConfigFile.drills)),
	),
	place: PlaceSchema.pipe(
		Schema.withDecodingDefault(Effect.succeed(defaultConfigFile.place)),
	),
	cnc: CncSchema.pipe(
		Schema.withDecodingDefault(Effect.succeed(defaultConfigFile.cnc)),
	),
	xtool: XToolSchema.pipe(
		Schema.withDecodingDefault(Effect.succeed(defaultConfigFile.xtool)),
	),
	makeracam: MakeracamSchema.pipe(
		Schema.withDecodingDefault(Effect.succeed(defaultConfigFile.makeracam)),
	),
	validation: ValidationSchema.pipe(
		Schema.withDecodingDefault(Effect.succeed(defaultConfigFile.validation)),
	),
});

export type ConfigFile = typeof ConfigFileSchema.Type;
