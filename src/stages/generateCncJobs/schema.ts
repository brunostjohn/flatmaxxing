import { Schema } from "effect";

export const BoundsTupleSchema = Schema.Tuple([
  Schema.Finite,
  Schema.Finite,
  Schema.Finite,
  Schema.Finite,
]);

export type BoundsTuple = Schema.Schema.Type<typeof BoundsTupleSchema>;
