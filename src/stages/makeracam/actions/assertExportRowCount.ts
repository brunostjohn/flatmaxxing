import { MakeraCamError } from "@/errors";
import { Effect } from "effect";
import { readToolNumberColumn } from "../helpers";

export const assertExportRowCount = Effect.fn(
  "flatmaxx.makeracam.assertExportRowCount",
)(function* (pid: number, expected: number) {
  const rows = yield* readToolNumberColumn(pid);
  if (rows.length !== expected) {
    return yield* Effect.fail(
      new MakeraCamError({
        message:
          `Export ToolPaths has ${rows.length} path row(s); expected ${expected}. ` +
          "A toolpath likely failed to Calculate.",
      }),
    );
  }
});
