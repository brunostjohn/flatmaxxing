import { Data } from "effect";

export class DrcError extends Data.TaggedError("DrcError")<{
  message: string;
  cause?: unknown;
}> {}
