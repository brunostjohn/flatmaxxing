import { MakeraCamError } from "@/errors";
import { Effect, Schedule } from "effect";
import { invokeRowMenuFromBottom, toolpathNodes } from "../helpers";

const NOT_LAST_YET = new MakeraCamError({
  message: "flatmaxx.makeracam.reorderContourLast.notLastYet",
});

const isContour = (title: string) => /Contour/.test(title);

export const reorderContourLast = Effect.fn(
  "flatmaxx.makeracam.reorderContourLast",
)(function* (pid: number) {
  const moveOnce = Effect.gen(function* () {
    const nodes = yield* toolpathNodes(pid);
    const idx = nodes.findIndex((group) =>
      Object.values(group.titles).some(isContour),
    );
    const contour = nodes[idx];
    if (contour === undefined || idx >= nodes.length - 1) return;
    yield* invokeRowMenuFromBottom(pid, contour, 5);
    return yield* Effect.fail(NOT_LAST_YET);
  });

  yield* moveOnce.pipe(
    Effect.retry(Schedule.recurs(23)),
    Effect.catchTag("MakeraCamError", () =>
      Effect.fail(
        new MakeraCamError({
          message:
            "Contour: could not move the edge-cut path to last after 24 attempts",
        }),
      ),
    ),
  );
});
