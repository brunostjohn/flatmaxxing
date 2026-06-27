import { Data } from "effect";

export class PreflightError extends Data.TaggedError("PreflightError")<{
  message: string;
  cause?: unknown;
}> {}
