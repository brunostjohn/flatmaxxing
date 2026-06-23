import { setWindowBounds, waitForElement } from "@/macos";
import { Context, Effect, Layer } from "effect";
import { ChildProcessSpawner } from "effect/unstable/process";
import {
  dismissRestorePrompt,
  dismissUpdateNag,
  MAKERACAM_APP,
} from "./actions";
import { confirmCloseExistingMakeraCam } from "./confirmCloseExistingMakeraCam";
import {
  DEFAULT_APP_PATH,
  getMakeraCamPids,
  launchMakeraCam,
  quitMakeraCam,
  waitForMakeraCamToExit,
} from "./process";
import type { MakeracamStepOptions } from "./types";

export type LifecycleReport = (message: string) => Effect.Effect<void>;

const noopReport: LifecycleReport = () => Effect.void;

export interface MakeraCamSession {
  readonly pid: number;
}

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
      new Error(
        "MakeraCAM was already open and the user declined to continue.",
      ),
    );
  }

  yield* processControl.waitForExit();
  return "closed" as const;
});

export const withMakeraCamSession = <A, E, R>(
  options: MakeracamStepOptions,
  body: (session: MakeraCamSession) => Effect.Effect<A, E, R>,
  report: LifecycleReport = noopReport,
) =>
  Effect.gen(function* () {
    yield* report("Checking for an existing MakeraCAM process...");
    const existingSession = yield* ensureMakeraCamNotAlreadyRunning();
    if (existingSession === "closed") {
      yield* report("Existing MakeraCAM process closed.");
    }

    yield* report("Launching MakeraCAM...");
    const appPath = options.appPath || DEFAULT_APP_PATH;
    const pid = yield* launchMakeraCam(appPath);

    yield* Effect.addFinalizer(() => quitMakeraCam(pid).pipe(Effect.ignore));

    yield* report("Waiting for the MakeraCAM welcome window...");
    yield* dismissRestorePrompt(pid);

    const b = options.windowBounds;
    yield* setWindowBounds(MAKERACAM_APP, b).pipe(Effect.ignore);

    yield* dismissUpdateNag(pid).pipe(Effect.ignore);

    yield* waitForElement(pid, { title: "3 AXIS" }, { timeoutMs: 30_000 });

    yield* setWindowBounds(MAKERACAM_APP, b).pipe(Effect.ignore);

    return yield* body({ pid });
  }).pipe(Effect.scoped);
