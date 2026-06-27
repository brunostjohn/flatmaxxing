import { MakeraCamError } from "@/errors";
import { Effect, Schedule } from "effect";
import { SETTLE } from "../constants";
import { readToolNumberColumn, replaceFieldValue } from "../helpers";

const NOT_SETTLED = new MakeraCamError({
  message: "flatmaxx.makeracam.setSequentialToolNumbers.notSettled",
});

const MAX_PASSES = 5;

export const setSequentialToolNumbers = Effect.fn(
  "flatmaxx.makeracam.setSequentialToolNumbers",
)(function* (pid: number, desired: readonly number[]) {
  const want = (index: number) => String(desired[index] ?? -1);

  const onePass = Effect.gen(function* () {
    const rows = yield* readToolNumberColumn(pid);

    yield* Effect.forEach(rows, (row, index) =>
      Effect.gen(function* () {
        if (index >= desired.length || row.value === want(index)) return;
        const { cx, cy } = row.toolNumberCell;
        yield* replaceFieldValue(cx, cy, want(index), SETTLE);
      }),
    );

    const after = yield* readToolNumberColumn(pid);
    const settled =
      after.length === desired.length &&
      after.every((row, index) => row.value === want(index));
    if (settled) return;
    return yield* Effect.fail(NOT_SETTLED);
  });

  yield* onePass.pipe(
    Effect.retry(Schedule.recurs(MAX_PASSES - 1)),
    Effect.catchTag("MakeraCamError", () =>
      Effect.fail(
        new MakeraCamError({
          message: `Export ToolPaths tool numbers did not settle to [${desired.join(",")}] after ${MAX_PASSES} passes.`,
        }),
      ),
    ),
  );
});
