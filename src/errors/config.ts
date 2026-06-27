import { Data } from "effect";

export class ConfigError extends Data.TaggedError("ConfigError")<{
  message: string;
  cause?: unknown;
}> {}

export class ConfigValidationError extends Data.TaggedError(
  "ConfigValidationError",
)<{
  message: string;
  errors: readonly string[];
  cause?: unknown;
}> {}
