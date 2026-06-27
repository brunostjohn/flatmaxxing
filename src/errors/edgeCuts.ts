import { Data } from "effect";

export class EdgeCutsError extends Data.TaggedError("EdgeCutsError")<{
  message: string;
  cause?: unknown;
}> {}

export class MissingAuxAxisOriginError extends Data.TaggedError(
  "MissingAuxAxisOriginError",
)<{
  message: string;
  cause?: unknown;
}> {}
