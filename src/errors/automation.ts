import { Data } from "effect";

export class MouseError extends Data.TaggedError("MouseError")<{
  message: string;
  cause?: unknown;
}> {}

export class ScreenshotError extends Data.TaggedError("ScreenshotError")<{
  message: string;
  cause?: unknown;
}> {}

export class AppleScriptError extends Data.TaggedError("AppleScriptError")<{
  message: string;
  cause?: unknown;
}> {}
