import { Schema } from "effect";

export const DxfBoundsSchema = Schema.Struct({
  width: Schema.Number,
  height: Schema.Number,
});

export const DxfWorkerResponseSchema = Schema.Union([
  Schema.Struct({
    ok: Schema.Literal(true),
    result: Schema.Union([DxfBoundsSchema, Schema.Boolean]),
  }),
  Schema.Struct({
    ok: Schema.Literal(false),
    error: Schema.String,
  }),
]);

export type DxfBounds = Schema.Schema.Type<typeof DxfBoundsSchema>;
