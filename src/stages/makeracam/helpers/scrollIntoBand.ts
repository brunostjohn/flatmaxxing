import { MakeraCamError } from "@/errors";
import { mouseScroll } from "@/macos";
import { Effect, Match, Schedule } from "effect";
import { SCROLL_STEP } from "../constants";
import { tabControlVisibility } from "./actionHelpers";
import type { LocateElement, ScrollIntoBandOptions } from "./types";

const KEEP_SCROLLING = "flatmaxx.makeracam.scrollIntoBand.keepScrolling";

export const scrollIntoBand = Effect.fnUntraced(function* (
  locate: LocateElement,
  options: ScrollIntoBandOptions,
) {
  const probe = Effect.gen(function* () {
    const element = yield* locate();
    if (element === undefined) {
      return yield* Effect.fail(
        new MakeraCamError({ message: options.notFound }),
      );
    }

    const visibility = tabControlVisibility(
      element,
      options.bandTop,
      options.bandBottom,
    );
    if (visibility === "visible") {
      return element;
    }

    yield* mouseScroll(
      options.anchor,
      element.cy > options.bandBottom ? -SCROLL_STEP : SCROLL_STEP,
    );
    return yield* Effect.fail(new MakeraCamError({ message: KEEP_SCROLLING }));
  });

  return yield* probe.pipe(
    Effect.retry({
      schedule: Schedule.spaced(options.settle).pipe(
        Schedule.take(options.maxTries - 1),
      ),
      while: (error) => error.message === KEEP_SCROLLING,
    }),
    Effect.catchTag("MakeraCamError", (error) =>
      Match.value(error.message === KEEP_SCROLLING).pipe(
        Match.when(true, () =>
          Effect.fail(new MakeraCamError({ message: options.outOfReach })),
        ),
        Match.orElse(() => Effect.fail(error)),
      ),
    ),
  );
});
