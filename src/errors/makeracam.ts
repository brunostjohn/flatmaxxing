import { Data } from "effect";

export class MakeraCamError extends Data.TaggedError("MakeraCamError")<{
  message: string;
  cause?: unknown;
}> {}
