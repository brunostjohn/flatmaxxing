import { MakeraCamError } from "@/errors";
import {
  clickElement,
  goToPath,
  pressKeyCode,
  pressReturn,
  waitForElement,
  waitForGone,
} from "@/macos";
import { Duration, Effect, Path, Schedule } from "effect";
import { KEY_ESCAPE, SETTLE } from "../constants";
import {
  layerGroupTitles,
  layerSelectorFor,
  layerTitleKey,
  layerTitleMatchesStem,
} from "../helpers";

const MAX_TRIES = 3;

const NO_NEW_LAYER = new MakeraCamError({
  message: "flatmaxx.makeracam.importPcbFile.noNewLayer",
});

const findNewLayerSelector = (pid: number, before: Set<string>, stem: string) =>
  Effect.gen(function* () {
    const added = (yield* layerGroupTitles(pid)).filter(
      (titles) => !before.has(layerTitleKey(titles)),
    );
    if (added.length === 0) {
      return yield* Effect.fail(NO_NEW_LAYER);
    }
    const matching = added.find((titles) =>
      layerTitleMatchesStem(titles, stem),
    );
    return layerSelectorFor(matching ?? added[0]!, stem);
  }).pipe(
    Effect.retry(Schedule.spaced(Duration.millis(300)).pipe(Schedule.take(49))),
  );

export const importPcbFile = Effect.fn("flatmaxx.makeracam.importPcbFile")(
  function* (pid: number, absPath: string) {
    const path = yield* Path.Path;
    const isDxf = absPath.toLowerCase().endsWith(".dxf");
    const importButton = isDxf ? "Import 2D Model" : "Import PCB";
    const fileBase = path.basename(absPath);
    const stem = fileBase.replace(/\.[^.]+$/, "");

    const attempt = Effect.gen(function* () {
      const before = new Set((yield* layerGroupTitles(pid)).map(layerTitleKey));
      yield* clickElement(pid, { role: "AXButton", title: importButton });

      yield* waitForElement(
        pid,
        { id: "open-panel" },
        { timeout: Duration.seconds(15) },
      ).pipe(Effect.catch(() => Effect.sleep(Duration.seconds(2))));
      yield* goToPath(absPath);
      yield* Effect.sleep(SETTLE);
      yield* pressReturn();
      yield* waitForGone(
        pid,
        { id: "open-panel" },
        { timeout: Duration.seconds(15) },
      ).pipe(Effect.ignore);

      return yield* findNewLayerSelector(pid, before, stem).pipe(
        Effect.tapError(() =>
          Effect.gen(function* () {
            yield* pressKeyCode(KEY_ESCAPE).pipe(Effect.ignore);
            yield* Effect.sleep(SETTLE);
          }),
        ),
      );
    });

    return yield* attempt.pipe(
      Effect.retry(Schedule.recurs(MAX_TRIES - 1)),
      Effect.catchTag("MakeraCamError", () =>
        Effect.fail(
          new MakeraCamError({
            message: `Import of ${fileBase} produced no new 2D layer group after ${MAX_TRIES} attempts.`,
          }),
        ),
      ),
    );
  },
);
