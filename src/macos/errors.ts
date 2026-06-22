import { Data } from "effect";

export class AXError extends Data.TaggedError("AXError")<{
	message: string;
	cause?: unknown;
}> {}

export class MouseError extends Data.TaggedError("MouseError")<{
	message: string;
	cause?: unknown;
}> {}

export class AxHelperError extends Data.TaggedError("AxHelperError")<{
	message: string;
	cause?: unknown;
}> {}

export class ElementNotFoundError extends Data.TaggedError(
	"ElementNotFoundError",
)<{
	message: string;
	cause?: unknown;
}> {}

export class AccessibilityPermissionError extends Data.TaggedError(
	"AccessibilityPermissionError",
)<{
	message: string;
	cause?: unknown;
}> {}

export class AppNotRunningError extends Data.TaggedError("AppNotRunningError")<{
	message: string;
	cause?: unknown;
}> {}

export class ScreenshotError extends Data.TaggedError("ScreenshotError")<{
	message: string;
	cause?: unknown;
}> {}

export class WindowControlError extends Data.TaggedError("WindowControlError")<{
	message: string;
	cause?: unknown;
}> {}
