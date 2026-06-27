import { Data } from "effect";

export class CliError extends Data.TaggedError("CliError")<{
  message: string;
  cause?: unknown;
}> {}
