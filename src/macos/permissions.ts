import { AccessibilityPermissionError } from "@/errors";
import { Effect } from "effect";
import {
  axRequestTrusted,
  axTrusted,
  screenCaptureGranted,
} from "./nativeHelper";

export const preflightAccessibility = Effect.fn(
  "flatmaxx.macos.preflightAccessibility",
)(function* () {
  if (yield* axTrusted()) return;

  yield* axRequestTrusted().pipe(Effect.ignore);

  return yield* Effect.fail(
    new AccessibilityPermissionError({
      message:
        "Accessibility access is not granted. Grant the app running flatmaxx " +
        "(the flatmaxx binary, or your terminal when run via bun) Accessibility " +
        "in System Settings → Privacy & Security → Accessibility, then re-run. " +
        "Screen Recording is also needed for screenshots.",
    }),
  );
});

export const screenRecordingGranted = Effect.fn(
  "flatmaxx.macos.screenRecordingGranted",
)(function* () {
  return yield* screenCaptureGranted();
});
