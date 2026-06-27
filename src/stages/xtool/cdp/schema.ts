import { Schema } from "effect";

export const XToolCdpTargetSchema = Schema.Struct({
  id: Schema.String,
  type: Schema.String,
  url: Schema.String,
  title: Schema.String.pipe(Schema.optional),
});

export const XToolCdpTargetsSchema = Schema.Array(XToolCdpTargetSchema);

export type XToolCdpTarget = Schema.Schema.Type<typeof XToolCdpTargetSchema>;
