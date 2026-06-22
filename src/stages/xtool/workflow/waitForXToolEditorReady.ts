import type { Client } from "chrome-remote-interface";
import { Effect, Schedule } from "effect";
import { runScriptInXToolStudio } from "../cdp";
import { isPageLoadingUnmounted } from "../scripts";

export const waitForXToolEditorReady = Effect.fn(
  "flatmaxx.xtool.waitForEditorReady",
)(function* ({ Runtime }: Pick<Client, "Runtime">) {
  const waitForPageLoading = Effect.gen(function* () {
    const isUnmounted = yield* runScriptInXToolStudio(
      isPageLoadingUnmounted,
      Runtime,
      true,
    );

    if (!isUnmounted) {
      return yield* Effect.fail(new Error("#page-loading is still mounted"));
    }
  });

  yield* waitForPageLoading.pipe(
    Effect.retry(
      Schedule.spaced(500).pipe(Schedule.both(Schedule.recurs(120))),
    ),
  );
});
