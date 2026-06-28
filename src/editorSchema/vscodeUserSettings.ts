import { Effect, FileSystem, Path } from "effect";
import { homedir } from "node:os";
import { tomlAssociationKey } from "./constants";

const editorDirectories = ["Code", "Code - Insiders", "Cursor", "VSCodium"];

export const vscodeUserSettingsCandidates = Effect.fn(
  "flatmaxx.editorSchema.userSettings",
)(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const home = yield* Effect.sync(() => homedir());
  const base = path.join(home, "Library", "Application Support");
  const candidates = editorDirectories.map((directory) =>
    path.join(base, directory, "User", "settings.json"),
  );

  return yield* Effect.filter(candidates, (file) =>
    fs.exists(path.dirname(file)).pipe(Effect.orElseSucceed(() => false)),
  );
});

export const settingsFileHasAssociation = Effect.fn(
  "flatmaxx.editorSchema.hasAssociation",
)(function* (settingsPath: string) {
  const fs = yield* FileSystem.FileSystem;
  const exists = yield* fs.exists(settingsPath);

  if (!exists) {
    return false;
  }

  const text = yield* fs.readFileString(settingsPath);
  return text.includes(`"${tomlAssociationKey}"`);
});
