import { Effect, Schema } from "effect";
import {
	defaultDistance,
	defaultElectroplatingAdditionalDistance,
	defaultRange,
	defaultXToolWindow,
} from "./defaults";

export const SideSchema = Schema.Literals(["front", "back"]);

export const RangeSchema = Schema.Struct({
	min: Schema.Number.pipe(
		Schema.withDecodingDefault(Effect.succeed(defaultRange.min)),
	),
	max: Schema.Number.pipe(
		Schema.withDecodingDefault(Effect.succeed(defaultRange.max)),
	),
});

export const DistanceSchema = Schema.Struct({
	x: Schema.Number.pipe(
		Schema.withDecodingDefault(Effect.succeed(defaultDistance.x)),
	),
	y: Schema.Number.pipe(
		Schema.withDecodingDefault(Effect.succeed(defaultDistance.y)),
	),
});

export const EdgeDistanceSchema = Schema.Struct({
	left: Schema.Number.pipe(
		Schema.withDecodingDefault(
			Effect.succeed(defaultElectroplatingAdditionalDistance.left),
		),
	),
	right: Schema.Number.pipe(
		Schema.withDecodingDefault(
			Effect.succeed(defaultElectroplatingAdditionalDistance.right),
		),
	),
	top: Schema.Number.pipe(
		Schema.withDecodingDefault(
			Effect.succeed(defaultElectroplatingAdditionalDistance.top),
		),
	),
	bottom: Schema.Number.pipe(
		Schema.withDecodingDefault(
			Effect.succeed(defaultElectroplatingAdditionalDistance.bottom),
		),
	),
});

export const WindowSchema = Schema.Struct({
	width: Schema.Number.pipe(
		Schema.withDecodingDefault(Effect.succeed(defaultXToolWindow.width)),
	),
	height: Schema.Number.pipe(
		Schema.withDecodingDefault(Effect.succeed(defaultXToolWindow.height)),
	),
});
