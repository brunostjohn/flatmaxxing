import { Effect, Fiber, Ref, Stream } from "effect";
import { ChildProcess } from "effect/unstable/process";

export const runProcessAndCollectOutput = Effect.fn(
	"flatmaxx.xtool.process.runAndCollectOutput",
)(function* (command: string, args: readonly string[]) {
	const childProcess = yield* ChildProcess.make(command, [...args]);
	const decoder = new TextDecoder();
	const stdout = yield* Ref.make("");
	const stderr = yield* Ref.make("");

	const stdoutFiber = yield* Stream.runForEach(childProcess.stdout, (line) =>
		Ref.update(stdout, (old) => `${old}${decoder.decode(line)}`),
	).pipe(Effect.forkChild);

	const stderrFiber = yield* Stream.runForEach(childProcess.stderr, (line) =>
		Ref.update(stderr, (old) => `${old}${decoder.decode(line)}`),
	).pipe(Effect.forkChild);

	const exitCode = yield* childProcess.exitCode;

	yield* Effect.all([Fiber.join(stdoutFiber), Fiber.join(stderrFiber)]);

	return {
		exitCode,
		stdout: yield* Ref.get(stdout),
		stderr: yield* Ref.get(stderr),
	};
});
