import { createTasklist } from "@/inkHelpers/tasklist";
import { VERSION } from "@/version";
import { Effect, FileSystem, Match, Path } from "effect";
import { isNewer } from "./compareVersions";
import { downloadBinary } from "./downloadBinary";
import { fetchLatestRelease } from "./fetchLatestRelease";
import { renderProgressBar } from "./renderProgressBar";
import { ensureInstalledBinary, replaceExecutable } from "./replaceExecutable";
import type { ReleaseInfo, RunUpdateOptions } from "./types";
import { verifyChecksum } from "./verifyChecksum";

const reportCheck = (release: ReleaseInfo) =>
  Effect.sync(() =>
    console.log(
      isNewer(release.version, VERSION)
        ? `An update is available: v${release.version} (current v${VERSION}).\nRun \`flatmaxx update\` to install it.`
        : `flatmaxx is up to date (v${VERSION}).`,
    ),
  );

const reportUpToDate = Effect.sync(() =>
  console.log(`flatmaxx is already up to date (v${VERSION}).`),
);

const performUpdate = Effect.fn("flatmaxx.update.perform")(function* (
  release: ReleaseInfo,
  execPath: string,
) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const temporaryPath = path.join(
    path.dirname(execPath),
    `.flatmaxx.update-${release.version}`,
  );

  const controls = yield* createTasklist(
    [
      {
        id: "download",
        label: `Download v${release.version}`,
        state: "pending",
      },
      { id: "verify", label: "Verify checksum", state: "pending" },
      { id: "install", label: "Install update", state: "pending" },
    ],
    `Updating flatmaxx ${VERSION} → ${release.version}`,
  );

  const steps = Effect.gen(function* () {
    yield* controls.runTask({
      path: "download",
      effect: downloadBinary(
        release.downloadUrl,
        temporaryPath,
        (downloaded, total) =>
          controls.setTaskStatus(
            "download",
            renderProgressBar(downloaded, total),
          ),
      ),
      success: { status: "downloaded" },
    });

    yield* controls.runTask({
      path: "verify",
      effect: verifyChecksum(temporaryPath, release.checksumUrl),
      success: { status: "verified" },
    });

    yield* controls.runTask({
      path: "install",
      effect: replaceExecutable(temporaryPath, execPath),
      success: {
        status: `updated to v${release.version} — restart flatmaxx to use it`,
      },
    });
  });

  yield* steps.pipe(
    Effect.ensuring(
      fs.remove(temporaryPath, { force: true }).pipe(Effect.ignore),
    ),
  );
});

export const runUpdate = Effect.fn("flatmaxx.update.run")(function* (
  options: RunUpdateOptions,
) {
  const execPath = yield* Effect.sync(() => process.execPath);
  yield* ensureInstalledBinary(execPath);

  yield* Effect.sync(() => console.log("Checking for updates…"));
  const release = yield* fetchLatestRelease();

  yield* Match.value({
    check: options.check,
    install: isNewer(release.version, VERSION) || options.force,
  }).pipe(
    Match.when({ check: true }, () => reportCheck(release)),
    Match.when({ install: false }, () => reportUpToDate),
    Match.orElse(() => performUpdate(release, execPath)),
  );
});
