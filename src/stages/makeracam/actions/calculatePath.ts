import { MakeraCamError } from "@/errors";
import { clickElement } from "@/macos";
import { Duration, Effect, Schedule } from "effect";
import { SETTLE } from "../constants";
import { toolpathNodes } from "../helpers";

const NOT_CALCULATED = new MakeraCamError({
  message: "flatmaxx.makeracam.calculatePath.notCalculated",
});

export const calculatePath = Effect.fn("flatmaxx.makeracam.calculatePath")(
  function* (pid: number) {
    const before = (yield* toolpathNodes(pid)).length;
    yield* clickElement(pid, { role: "AXButton", title: "Calculate" });

    const waitForNewNode = Effect.gen(function* () {
      if ((yield* toolpathNodes(pid)).length > before) return;
      return yield* Effect.fail(NOT_CALCULATED);
    });

    yield* waitForNewNode.pipe(
      Effect.retry(
        Schedule.spaced(Duration.millis(300)).pipe(Schedule.take(119)),
      ),
      Effect.ignore,
    );
    yield* Effect.sleep(SETTLE);
  },
);
