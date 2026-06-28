import { UpdateError } from "@/errors";
import { Effect, FileSystem, Match, Option, Ref, Stream } from "effect";
import { Headers, HttpClient } from "effect/unstable/http";
import { updateUserAgent } from "./constants";

const parseContentLength = (headers: Headers.Headers) =>
  Option.match(Headers.get(headers, "content-length"), {
    onNone: () => 0,
    onSome: (value) => Number.parseInt(value, 10) || 0,
  });

export const downloadBinary = Effect.fn("flatmaxx.update.download")(function* (
  url: string,
  destinationPath: string,
  onProgress: (downloaded: number, total: number) => Effect.Effect<void>,
) {
  const fs = yield* FileSystem.FileSystem;

  const response = yield* HttpClient.get(url, {
    headers: { "User-Agent": updateUserAgent },
  }).pipe(
    Effect.mapError(
      (cause) =>
        new UpdateError({ message: "Failed to start the download.", cause }),
    ),
  );

  const total = parseContentLength(response.headers);
  const downloaded = yield* Ref.make(0);
  const lastPercent = yield* Ref.make(-1);

  const reportProgress = (chunkLength: number) =>
    Effect.gen(function* () {
      const current = yield* Ref.updateAndGet(
        downloaded,
        (value) => value + chunkLength,
      );
      const percent = total > 0 ? Math.floor((current * 100) / total) : -1;
      const previous = yield* Ref.get(lastPercent);

      yield* Match.value(percent !== previous).pipe(
        Match.when(true, () =>
          Ref.set(lastPercent, percent).pipe(
            Effect.andThen(onProgress(current, total)),
          ),
        ),
        Match.orElse(() => Effect.void),
      );
    });

  const trackedStream = response.stream.pipe(
    Stream.tap((chunk) => reportProgress(chunk.length)),
  );

  yield* Stream.run(
    trackedStream,
    fs.sink(destinationPath, { flag: "w", mode: 0o755 }),
  ).pipe(
    Effect.mapError(
      (cause) =>
        new UpdateError({
          message: "Failed while downloading the update.",
          cause,
        }),
    ),
  );

  const finalDownloaded = yield* Ref.get(downloaded);
  yield* onProgress(finalDownloaded, total);
});
