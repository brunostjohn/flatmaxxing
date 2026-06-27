import { Data } from "effect";

export class XToolError extends Data.TaggedError("XToolError")<{
  message: string;
  cause?: unknown;
}> {}
