import { Data } from "effect";

export class ProcessError extends Data.TaggedError("ProcessError")<{
  message: string;
  cause?: unknown;
}> {}
