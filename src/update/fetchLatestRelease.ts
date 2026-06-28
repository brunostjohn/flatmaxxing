import { UpdateError } from "@/errors";
import { Array, Effect, Option, Schema } from "effect";
import { HttpClient } from "effect/unstable/http";
import { normalizeVersion } from "./compareVersions";
import {
  latestReleaseApiUrl,
  updateAssetName,
  updateChecksumAssetName,
  updateRequestTimeout,
  updateUserAgent,
} from "./constants";
import { type GithubRelease, GithubReleaseSchema } from "./githubReleaseSchema";
import type { ReleaseInfo } from "./types";

const findAssetUrl = (release: GithubRelease, assetName: string) =>
  Option.match(
    Array.findFirst(release.assets, (asset) => asset.name === assetName),
    {
      onNone: () =>
        Effect.fail(
          new UpdateError({
            message: `The latest release is missing the "${assetName}" asset.`,
          }),
        ),
      onSome: (asset) => Effect.succeed(asset.browser_download_url),
    },
  );

export const fetchLatestRelease = Effect.fn("flatmaxx.update.fetchLatest")(
  function* () {
    const response = yield* HttpClient.get(latestReleaseApiUrl, {
      headers: {
        "User-Agent": updateUserAgent,
        Accept: "application/vnd.github+json",
      },
    }).pipe(
      Effect.timeout(updateRequestTimeout),
      Effect.mapError(
        (cause) =>
          new UpdateError({
            message: "Failed to reach the GitHub releases API.",
            cause,
          }),
      ),
    );

    const payload = yield* response.json.pipe(
      Effect.mapError(
        (cause) =>
          new UpdateError({
            message: "Failed to read the latest release metadata.",
            cause,
          }),
      ),
    );

    const release = yield* Schema.decodeUnknownEffect(GithubReleaseSchema)(
      payload,
    ).pipe(
      Effect.mapError(
        (cause) =>
          new UpdateError({
            message: "The GitHub release metadata had an unexpected shape.",
            cause,
          }),
      ),
    );

    const downloadUrl = yield* findAssetUrl(release, updateAssetName);
    const checksumUrl = yield* findAssetUrl(release, updateChecksumAssetName);

    return {
      version: normalizeVersion(release.tag_name),
      tag: release.tag_name,
      downloadUrl,
      checksumUrl,
    } satisfies ReleaseInfo;
  },
);
