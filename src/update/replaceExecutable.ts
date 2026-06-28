import { UpdateError } from "@/errors";
import { Effect, FileSystem, Match } from "effect";
import { devRuntimeBinaries, homebrewPathMarkers } from "./constants";

const basename = (filePath: string) => filePath.split("/").pop() ?? "";

const isHomebrewPath = (execPath: string) =>
  homebrewPathMarkers.some((marker) => execPath.includes(marker));

const isDevRuntime = (execPath: string) =>
  devRuntimeBinaries.some((name) => name === basename(execPath));

export const ensureInstalledBinary = (execPath: string) =>
  Match.value(isDevRuntime(execPath)).pipe(
    Match.when(true, () =>
      Effect.fail(
        new UpdateError({
          message:
            "`flatmaxx update` is only available from the installed flatmaxx binary, not when running through bun or node.",
        }),
      ),
    ),
    Match.orElse(() => Effect.void),
  );

export const replaceExecutable = Effect.fn("flatmaxx.update.replace")(
  function* (temporaryPath: string, execPath: string) {
    const fs = yield* FileSystem.FileSystem;

    yield* Match.value(isHomebrewPath(execPath)).pipe(
      Match.when(true, () =>
        Effect.fail(
          new UpdateError({
            message:
              "flatmaxx was installed with Homebrew. Run `brew upgrade flatmaxx` instead.",
          }),
        ),
      ),
      Match.orElse(() => Effect.void),
    );

    yield* fs.rename(temporaryPath, execPath).pipe(
      Effect.mapError(
        (cause) =>
          new UpdateError({
            message: `Failed to replace ${execPath}. Check that you have write permission.`,
            cause,
          }),
      ),
    );

    yield* fs.chmod(execPath, 0o755).pipe(
      Effect.mapError(
        (cause) =>
          new UpdateError({
            message: "Failed to mark the new binary as executable.",
            cause,
          }),
      ),
    );
  },
);
