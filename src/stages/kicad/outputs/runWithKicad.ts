import { KicadError } from "@/errors";
import { runCollectingBoth } from "@/process";
import type { RunWithKicadOptions } from "@/stages/kicad/outputs/types";
import { Array, Effect, Match, Option } from "effect";

const lastNonEmptyLine = (output: string): Option.Option<string> =>
  Array.findLast(output.split("\n"), (line) => line.trim().length > 0);

export const runWithKicad = Effect.fn(
  "flatmaxx.generateKicadOutputs.runWithKicad",
)(function* ({ context, args, onOutput }: RunWithKicadOptions) {
  const { stdout, stderr, exitCode } = yield* runCollectingBoth(
    context.kicadCli,
    [...args, context.pcbFile],
    { cwd: context.project },
  );

  const combined = `${stderr}\n${stdout}`;

  yield* Option.match(lastNonEmptyLine(combined), {
    onNone: () => Effect.void,
    onSome: (line) => onOutput(line),
  });

  return yield* Match.value(exitCode).pipe(
    Match.when(0, () => Effect.void),
    Match.orElse((code) =>
      Effect.fail(
        new KicadError({
          message: `Failed to execute command: ${context.kicadCli} ${args.join(
            " ",
          )}. Code: ${code}. Output: ${combined.trim()}`,
        }),
      ),
    ),
  );
}, Effect.scoped);
