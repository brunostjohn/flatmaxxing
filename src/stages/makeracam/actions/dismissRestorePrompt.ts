import { MakeraCamError } from "@/errors";
import { clickElement, elementExists } from "@/macos";
import { Duration, Effect, Schedule } from "effect";

const NOT_READY = new MakeraCamError({
  message: "flatmaxx.makeracam.dismissRestorePrompt.notReady",
});

export const dismissRestorePrompt = Effect.fn(
  "flatmaxx.makeracam.dismissRestorePrompt",
)(function* (pid: number) {
  const probe = Effect.gen(function* () {
    const ready =
      (yield* elementExists(pid, { title: "Welcome to MakerCAM" })) ||
      (yield* elementExists(pid, { title: "3 AXIS" }));
    if (ready) return;

    const hasNo = yield* elementExists(pid, { role: "AXButton", title: "No" });
    const hasYes = yield* elementExists(pid, {
      role: "AXButton",
      title: "Yes",
    });
    if (hasNo && hasYes) {
      yield* clickElement(pid, { role: "AXButton", title: "No" });
    }
    return yield* Effect.fail(NOT_READY);
  });

  yield* probe.pipe(
    Effect.retry(
      Schedule.spaced(Duration.millis(300)).pipe(Schedule.take(129)),
    ),
    Effect.ignore,
  );
});
