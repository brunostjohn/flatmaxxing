import { CliError } from "@/errors";
import { Effect } from "effect";
import { createInterface } from "node:readline/promises";

export const promptLine = Effect.fn("flatmaxx.cli.promptLine")(function* (
  question: string,
) {
  return yield* Effect.acquireUseRelease(
    Effect.sync(() =>
      createInterface({ input: process.stdin, output: process.stdout }),
    ),
    (readline) =>
      Effect.tryPromise({
        try: () => readline.question(question),
        catch: (cause) =>
          new CliError({ message: "Failed to read input.", cause }),
      }),
    (readline) => Effect.sync(() => readline.close()),
  );
});

export const promptYesNo = Effect.fn("flatmaxx.cli.promptYesNo")(function* (
  question: string,
  options: { readonly defaultYes?: boolean } = {},
) {
  const defaultYes = options.defaultYes ?? true;
  const answer = (yield* promptLine(question)).trim().toLowerCase();

  if (answer === "") {
    return defaultYes;
  }

  return answer === "y" || answer === "yes";
});
