import { Data } from "effect";

export class CncError extends Data.TaggedError("CncError")<{
  message: string;
  cause?: unknown;
}> {}
