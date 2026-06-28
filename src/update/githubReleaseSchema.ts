import { Schema } from "effect";

export const GithubReleaseAssetSchema = Schema.Struct({
  name: Schema.String,
  browser_download_url: Schema.String,
});

export const GithubReleaseSchema = Schema.Struct({
  tag_name: Schema.String,
  assets: Schema.Array(GithubReleaseAssetSchema),
});

export type GithubRelease = Schema.Schema.Type<typeof GithubReleaseSchema>;
