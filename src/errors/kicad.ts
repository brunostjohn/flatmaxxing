import { Data } from "effect";

export class KicadError extends Data.TaggedError("KicadError")<{
  message: string;
  cause?: unknown;
}> {}

export class BoardValidationError extends Data.TaggedError(
  "BoardValidationError",
)<{
  message: string;
  cause?: unknown;
}> {}
