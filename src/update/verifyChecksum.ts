import { UpdateError } from "@/errors";
import { Effect, FileSystem, Match } from "effect";
import { HttpClient } from "effect/unstable/http";
import { updateUserAgent } from "./constants";

const fetchExpectedHash = Effect.fn("flatmaxx.update.expectedHash")(function* (
  checksumUrl: string,
) {
  const response = yield* HttpClient.get(checksumUrl, {
    headers: { "User-Agent": updateUserAgent },
  }).pipe(
    Effect.mapError(
      (cause) =>
        new UpdateError({ message: "Failed to download the checksum.", cause }),
    ),
  );

  const body = yield* response.text.pipe(
    Effect.mapError(
      (cause) =>
        new UpdateError({ message: "Failed to read the checksum.", cause }),
    ),
  );

  return (body.trim().split(/\s+/)[0] ?? "").toLowerCase();
});

const hashFile = Effect.fn("flatmaxx.update.hashFile")(function* (
  filePath: string,
) {
  const fs = yield* FileSystem.FileSystem;
  const bytes = yield* fs.readFile(filePath).pipe(
    Effect.mapError(
      (cause) =>
        new UpdateError({
          message: "Failed to read the downloaded update.",
          cause,
        }),
    ),
  );

  return yield* Effect.try({
    try: () => new Bun.CryptoHasher("sha256").update(bytes).digest("hex"),
    catch: (cause) =>
      new UpdateError({
        message: "Failed to hash the downloaded update.",
        cause,
      }),
  });
});

export const verifyChecksum = Effect.fn("flatmaxx.update.verify")(function* (
  filePath: string,
  checksumUrl: string,
) {
  const expected = yield* fetchExpectedHash(checksumUrl);
  const actual = yield* hashFile(filePath);

  yield* Match.value(expected.length > 0 && actual === expected).pipe(
    Match.when(true, () => Effect.void),
    Match.orElse(() =>
      Effect.fail(
        new UpdateError({
          message: `Checksum verification failed (expected ${
            expected || "<empty>"
          }, got ${actual}).`,
        }),
      ),
    ),
  );
});
