import { Effect, Fiber, Ref, Stream } from "effect";
import { ChildProcess } from "effect/unstable/process";

export const runAppleScript = Effect.fn("flatmaxx.runAppleScript")(function* (
  script: string,
) {
  const osaScript = yield* ChildProcess.make(`osascript`, ["-e", script]);

  const completeStdout = yield* Ref.make("");
  const completeStderr = yield* Ref.make("");

  const stdoutFiber = yield* Stream.runForEach(osaScript.stdout, (line) =>
    Effect.gen(function* () {
      yield* Ref.update(completeStdout, (old) => `${old}\n${line}`);
    }),
  ).pipe(Effect.forkChild);

  const stderrFiber = yield* Stream.runForEach(osaScript.stderr, (line) =>
    Effect.gen(function* () {
      yield* Ref.update(completeStderr, (old) => `${old}\n${line}`);
    }),
  ).pipe(Effect.forkChild);

  const exitCode = yield* osaScript.exitCode;

  yield* Effect.all([Fiber.join(stdoutFiber), Fiber.join(stderrFiber)]);

  const result = yield* Ref.get(completeStdout);

  if (exitCode !== 0) {
    return yield* Effect.fail(new Error(yield* Ref.get(completeStderr)));
  }

  return result;
});
