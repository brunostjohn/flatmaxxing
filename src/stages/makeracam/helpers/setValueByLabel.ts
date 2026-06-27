import { MakeraCamError } from "@/errors";
import { axFind } from "@/macos";
import { Duration, Effect } from "effect";
import { replaceFieldValue } from "./replaceFieldValue";

export const setValueByLabel = Effect.fn("flatmaxx.makeracam.setValueByLabel")(
  function* (pid: number, labelTitle: string, value: string) {
    const labels = yield* axFind(pid, {
      role: "AXStaticText",
      title: labelTitle,
    });
    const label = labels[0];
    if (label === undefined) {
      return yield* Effect.fail(
        new MakeraCamError({ message: `no label "${labelTitle}" found` }),
      );
    }

    const field = (yield* axFind(pid, { role: "AXTextField" }))
      .filter((f) => Math.abs(f.y - label.y) <= 12 && f.x > label.x)
      .sort((a, b) => a.x - b.x)[0];
    if (field === undefined) {
      return yield* Effect.fail(
        new MakeraCamError({
          message: `no text field on the row of "${labelTitle}"`,
        }),
      );
    }

    yield* replaceFieldValue(field.cx, field.cy, value, Duration.millis(200));
  },
);
