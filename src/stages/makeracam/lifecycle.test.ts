import { expect, test } from "bun:test";
import { Effect, Layer } from "effect";
import { waitForMakeraCamToExitWithProbe } from "./process";
import {
  MakeraCamProcessControl,
  ensureMakeraCamNotAlreadyRunning,
} from "./lifecycle";

test("MakeraCAM existing-process check continues when no process is running", async () => {
  let prompted = false;
  const result = await Effect.runPromise(
    ensureMakeraCamNotAlreadyRunning().pipe(
      Effect.provide(
        Layer.succeed(MakeraCamProcessControl, {
          getPids: () => Effect.succeed([]),
          confirmCloseExisting: () =>
            Effect.sync(() => {
              prompted = true;
              return true;
            }),
          waitForExit: () => Effect.void,
        }),
      ),
    ),
  );

  expect(result).toBe("none");
  expect(prompted).toBe(false);
});

test("MakeraCAM existing-process check fails when the user declines", async () => {
  await expect(
    Effect.runPromise(
      ensureMakeraCamNotAlreadyRunning().pipe(
        Effect.provide(
          Layer.succeed(MakeraCamProcessControl, {
            getPids: () => Effect.succeed([123]),
            confirmCloseExisting: () => Effect.succeed(false),
            waitForExit: () => Effect.void,
          }),
        ),
      ),
    ),
  ).rejects.toThrow("user declined");
});

test("MakeraCAM existing-process check waits when the user confirms", async () => {
  let waited = false;
  const result = await Effect.runPromise(
    ensureMakeraCamNotAlreadyRunning().pipe(
      Effect.provide(
        Layer.succeed(MakeraCamProcessControl, {
          getPids: () => Effect.succeed([123]),
          confirmCloseExisting: () => Effect.succeed(true),
          waitForExit: () =>
            Effect.sync(() => {
              waited = true;
            }),
        }),
      ),
    ),
  );

  expect(result).toBe("closed");
  expect(waited).toBe(true);
});

test("waitForMakeraCamToExit succeeds once the process list clears", async () => {
  let calls = 0;

  await Effect.runPromise(
    waitForMakeraCamToExitWithProbe(
      () =>
        Effect.sync(() => {
          calls += 1;
          return calls === 1 ? [123] : [];
        }),
      { intervalMs: 0, recurs: 1 },
    ),
  );

  expect(calls).toBe(2);
});

test("waitForMakeraCamToExit fails when processes remain", async () => {
  await expect(
    Effect.runPromise(
      waitForMakeraCamToExitWithProbe(() => Effect.succeed([123]), {
        intervalMs: 0,
        recurs: 0,
      }),
    ),
  ).rejects.toThrow("MakeraCAM is still running");
});
