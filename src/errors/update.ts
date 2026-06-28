import { Data } from "effect";

export class UpdateError extends Data.TaggedError("UpdateError")<{
  message: string;
  cause?: unknown;
}> {}
