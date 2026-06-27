import { Data } from "effect";

export class DrillError extends Data.TaggedError("DrillError")<{
  message: string;
  cause?: unknown;
}> {}
