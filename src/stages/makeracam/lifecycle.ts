import { MakeraCamError } from "@/errors";
import { setWindowBounds, waitForElement } from "@/macos";
import { Context, Duration, Effect, Layer } from "effect";
import { ChildProcessSpawner } from "effect/unstable/process";
import { dismissRestorePrompt, dismissUpdateNag } from "./actions";
import { confirmCloseExistingMakeraCam } from "./confirmCloseExistingMakeraCam";
import {
  DEFAULT_APP_PATH,
  getMakeraCamPids,
  launchMakeraCam,
  MAKERACAM_PROCESS,
  quitMakeraCam,
  waitForMakeraCamToExit,
} from "./process";
import type { MakeraCamSession, MakeracamStepOptions } from "./types";

export interface MakeraCamReporterShape {
  readonly report: (message: string) => Effect.Effect<void>;
}

export class MakeraCamReporter extends Context.Service<
  MakeraCamReporter,
  MakeraCamReporterShape
>()("flatmaxx/makeracam/Reporter") {}

export const MakeraCamReporterNoop = Layer.succeed(MakeraCamReporter, {
  report: () => Effect.void,
});

export interface MakeraCamProcessControlService {
  readonly getPids: () => Effect.Effect<readonly number[], unknown>;
  readonly confirmCloseExisting: (
    processIds: readonly number[],
  ) => Effect.Effect<boolean, unknown>;
  readonly waitForExit: () => Effect.Effect<void, unknown>;
}

export class MakeraCamProcessControl extends Context.Service<
  MakeraCamProcessControl,
  MakeraCamProcessControlService
>()("flatmaxx/makeracam/ProcessControl") {}

export const MakeraCamProcessControlLive = Layer.effect(
  MakeraCamProcessControl,
  Effect.gen(function* () {
    const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;

    return MakeraCamProcessControl.of({
      getPids: () =>
        getMakeraCamPids().pipe(
          Effect.provideService(
            ChildProcessSpawner.ChildProcessSpawner,
            spawner,
          ),
        ),
      confirmCloseExisting: confirmCloseExistingMakeraCam,
      waitForExit: () =>
        waitForMakeraCamToExit().pipe(
          Effect.provideService(
            ChildProcessSpawner.ChildProcessSpawner,
            spawner,
          ),
        ),
    });
  }),
);

export const ensureMakeraCamNotAlreadyRunning = Effect.fn(
  "flatmaxx.makeracam.ensureNotAlreadyRunning",
)(function* () {
  const processControl = yield* MakeraCamProcessControl;
  const existing = yield* processControl.getPids();
  if (existing.length === 0) {
    return "none" as const;
  }

  const shouldWait = yield* processControl.confirmCloseExisting(existing);
  if (!shouldWait) {
    return yield* Effect.fail(
      new MakeraCamError({
        message:
          "MakeraCAM was already open and the user declined to continue.",
      }),
    );
  }

  yield* processControl.waitForExit();
  return "closed" as const;
});

export const withMakeraCamSession = Effect.fn("flatmaxx.makeracam.withSession")(
  function* (options: MakeracamStepOptions) {
    const reporter = yield* MakeraCamReporter;

    yield* reporter.report("Checking for an existing MakeraCAM process...");
    const existing = yield* ensureMakeraCamNotAlreadyRunning();
    if (existing === "closed") {
      yield* reporter.report("Existing MakeraCAM process closed.");
    }

    yield* reporter.report("Launching MakeraCAM...");
    const pid = yield* launchMakeraCam(options.appPath || DEFAULT_APP_PATH);
    yield* Effect.addFinalizer(() => quitMakeraCam(pid).pipe(Effect.ignore));

    yield* reporter.report("Waiting for the MakeraCAM welcome window...");
    yield* dismissRestorePrompt(pid);

    yield* setWindowBounds(MAKERACAM_PROCESS, options.windowBounds).pipe(
      Effect.ignore,
    );
    yield* dismissUpdateNag(pid).pipe(Effect.ignore);

    yield* waitForElement(
      pid,
      { title: "3 AXIS" },
      { timeout: Duration.seconds(30) },
    );

    yield* setWindowBounds(MAKERACAM_PROCESS, options.windowBounds).pipe(
      Effect.ignore,
    );

    return { pid } satisfies MakeraCamSession;
  },
);
