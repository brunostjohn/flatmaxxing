import { MakeraCamError, ProcessError } from "@/errors";
import { Duration, Effect, Schedule } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process";
import type { WaitForMakeraCamToExitOptions } from "./types";

export const MAKERACAM_PROCESS = "MakeraCAM";

export const DEFAULT_APP_PATH = "/Applications/MakeraCAM.app";

const LAUNCH_POLL = Duration.millis(500);
const LAUNCH_ATTEMPTS = 120;
const QUIT_POLL = Duration.millis(500);
const QUIT_ATTEMPTS = 20;
const DEFAULT_EXIT_INTERVAL_MS = 500;
const DEFAULT_EXIT_RECURS = 240;

const parsePgrepOutput = (output: string) =>
  output
    .split(/\s+/)
    .map((value) => Number.parseInt(value, 10))
    .filter((value) => Number.isInteger(value) && value > 0);

export const getMakeraCamPids = Effect.fn("flatmaxx.makeracam.getPids")(
  function* () {
    const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
    const output = yield* spawner.string(
      ChildProcess.make("pgrep", ["-x", MAKERACAM_PROCESS]),
    );
    return parsePgrepOutput(output);
  },
);

const NOT_YET_LAUNCHED = new MakeraCamError({
  message: "flatmaxx.makeracam.launch.notYet",
});

export const launchMakeraCam = Effect.fn("flatmaxx.makeracam.launch")(
  function* (appPath: string = DEFAULT_APP_PATH) {
    const proc = yield* ChildProcess.make("open", ["-na", appPath]);
    const exitCode = yield* proc.exitCode;
    if (exitCode !== 0) {
      return yield* Effect.fail(
        new ProcessError({
          message: `Failed to launch MakeraCAM (open -na exited ${exitCode}).`,
        }),
      );
    }

    const probe = Effect.gen(function* () {
      const pid = (yield* getMakeraCamPids())[0];
      if (pid !== undefined) return pid;
      return yield* Effect.fail(NOT_YET_LAUNCHED);
    });

    return yield* probe.pipe(
      Effect.retry(
        Schedule.spaced(LAUNCH_POLL).pipe(Schedule.take(LAUNCH_ATTEMPTS - 1)),
      ),
      Effect.catchTag("MakeraCamError", () =>
        Effect.fail(
          new MakeraCamError({
            message: "MakeraCAM did not appear to pgrep after launch.",
          }),
        ),
      ),
    );
  },
);

export const waitForMakeraCamToExitWithProbe = <E, R>(
  getPids: () => Effect.Effect<readonly number[], E, R>,
  options: WaitForMakeraCamToExitOptions = {},
) => {
  const waitForNoProcesses = Effect.gen(function* () {
    const processIds = yield* getPids();
    if (processIds.length > 0) {
      return yield* Effect.fail(
        new MakeraCamError({
          message: `MakeraCAM is still running: ${processIds.join(", ")}`,
        }),
      );
    }
  });

  return waitForNoProcesses.pipe(
    Effect.retry(
      Schedule.spaced(
        Duration.millis(options.intervalMs ?? DEFAULT_EXIT_INTERVAL_MS),
      ).pipe(
        Schedule.both(Schedule.recurs(options.recurs ?? DEFAULT_EXIT_RECURS)),
      ),
    ),
  );
};

export const waitForMakeraCamToExit = Effect.fn(
  "flatmaxx.makeracam.waitForExit",
)(function* (options: WaitForMakeraCamToExitOptions = {}) {
  yield* waitForMakeraCamToExitWithProbe(getMakeraCamPids, options);
});

const stillAlive = (pid: number) => {
  try {
    globalThis.process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

const sendSignal = (pid: number, signal: "SIGTERM" | "SIGKILL") => {
  try {
    globalThis.process.kill(pid, signal);
  } catch (error) {
    if (
      !(error instanceof Error && "code" in error && error.code === "ESRCH")
    ) {
      throw error;
    }
  }
};

const STILL_ALIVE = new MakeraCamError({
  message: "flatmaxx.makeracam.quit.stillAlive",
});

export const quitMakeraCam = Effect.fn("flatmaxx.makeracam.quit")(function* (
  pid: number,
) {
  yield* Effect.sync(() => sendSignal(pid, "SIGTERM"));

  const probe = Effect.gen(function* () {
    if (!(yield* Effect.sync(() => stillAlive(pid)))) return;
    return yield* Effect.fail(STILL_ALIVE);
  });

  const gone = yield* probe.pipe(
    Effect.retry(
      Schedule.spaced(QUIT_POLL).pipe(Schedule.take(QUIT_ATTEMPTS - 1)),
    ),
    Effect.isSuccess,
  );
  if (gone) return;

  yield* Effect.sync(() => sendSignal(pid, "SIGKILL"));
});
