import { Data } from "effect";

export class RenderError extends Data.TaggedError("RenderError")<{
  message: string;
  cause?: unknown;
}> {}
