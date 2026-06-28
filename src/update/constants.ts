export const updateRepoOwner = "brunostjohn";
export const updateRepoName = "flatmaxxing";
export const updateAssetName = "flatmaxx-darwin-arm64";
export const updateChecksumAssetName = "flatmaxx-darwin-arm64.sha256";
export const updateUserAgent = "flatmaxx-updater";
export const latestReleaseApiUrl = `https://api.github.com/repos/${updateRepoOwner}/${updateRepoName}/releases/latest`;
export const updateRequestTimeout = "15 seconds";
export const homebrewPathMarkers = [
  "/Cellar/",
  "/opt/homebrew/",
  "/usr/local/Cellar/",
];
export const devRuntimeBinaries = ["bun", "node"];
