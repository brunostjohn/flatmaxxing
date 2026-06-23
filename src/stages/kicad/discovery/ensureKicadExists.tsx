import { renderOnce, renderWaiting } from "@/inkHelpers";
import { Alert } from "@inkjs/ui";
import { Effect } from "effect";
import { FileSystem } from "effect/FileSystem";

export const ensureKicadExists = Effect.fn("flatmaxx.ensureKicadExists")(
  function* (pathToKicad: string) {
    const fs = yield* FileSystem;

    const [success, _, stop] = yield* renderWaiting({
      success: "KiCAD found",
      loading: "Checking if KiCAD exists...",
    });

    if (!(yield* fs.exists(pathToKicad))) {
      yield* stop;

      yield* renderOnce(
        <Alert variant="error">The file "{pathToKicad}" does not exist.</Alert>,
      );

      return yield* Effect.fail(
        new Error(`The file "${pathToKicad}" does not exist.`),
      );
    }

    yield* success();
  },
);
