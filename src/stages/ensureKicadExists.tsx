import { renderOnce } from "@/inkHelpers";
import { Alert } from "@inkjs/ui";
import { Effect } from "effect";
import { FileSystem } from "effect/FileSystem";

export const ensureKicadExists = Effect.fn("flatmaxx.ensureKicadExists")(
  function* (pathToKicad: string) {
    const fs = yield* FileSystem;

    if (!(yield* fs.exists(pathToKicad))) {
      yield* renderOnce(
        <Alert variant="error">The file "{pathToKicad}" does not exist.</Alert>,
      );
    }
  },
);
