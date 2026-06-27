import { Schema } from "effect";

export const DrcViolationItemSchema = Schema.Struct({
  description: Schema.String.pipe(Schema.optional),
  pos: Schema.Struct({
    x: Schema.Number,
    y: Schema.Number,
  }).pipe(Schema.optional),
  uuid: Schema.String.pipe(Schema.optional),
});

export const DrcViolationSchema = Schema.Struct({
  type: Schema.String,
  severity: Schema.String,
  description: Schema.String.pipe(Schema.optional),
  items: Schema.Array(DrcViolationItemSchema).pipe(Schema.optional),
});

export const DrcReportSchema = Schema.Struct({
  violations: Schema.Array(DrcViolationSchema).pipe(Schema.optional),
});

export type DrcViolationItem = Schema.Schema.Type<
  typeof DrcViolationItemSchema
>;

export type DrcViolation = Schema.Schema.Type<typeof DrcViolationSchema>;

export type DrcReport = Schema.Schema.Type<typeof DrcReportSchema>;
