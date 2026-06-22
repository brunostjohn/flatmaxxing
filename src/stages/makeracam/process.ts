import { Duration, Effect } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process";

export const MAKERACAM_PROCESS = "MakeraCAM";

export const DEFAULT_APP_PATH = "/Applications/MakeraCAM.app";

const parsePgrepOutput = (output: string): number[] =>
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

export const launchMakeraCam = Effect.fn("flatmaxx.makeracam.launch")(
  function* (appPath: string = DEFAULT_APP_PATH) {
    const proc = yield* ChildProcess.make("open", ["-na", appPath]);
    const exitCode = yield* proc.exitCode;
    if (exitCode !== 0) {
      return yield* Effect.fail(
        new Error(`Failed to launch MakeraCAM (open -na exited ${exitCode}).`),
      );
    }

    const everyMs = 500;
    const attempts = 120;
    for (let i = 0; i < attempts; i++) {
      const pids = yield* getMakeraCamPids();
      const pid = pids[0];
      if (pid !== undefined) return pid;
      yield* Effect.sleep(Duration.millis(everyMs));
    }
    return yield* Effect.fail(
      new Error("MakeraCAM did not appear to pgrep after launch."),
    );
  },
);

export const quitMakeraCam = Effect.fn("flatmaxx.makeracam.quit")(function* (
  pid: number,
) {
  const stillAlive = (): boolean => {
    try {
      globalThis.process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  };

  const send = (signal: "SIGTERM" | "SIGKILL"): void => {
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

  yield* Effect.sync(() => send("SIGTERM"));

  const everyMs = 500;
  const attempts = 20;
  for (let i = 0; i < attempts; i++) {
    if (!stillAlive()) return;
    yield* Effect.sleep(Duration.millis(everyMs));
  }

  yield* Effect.sync(() => send("SIGKILL"));
});
