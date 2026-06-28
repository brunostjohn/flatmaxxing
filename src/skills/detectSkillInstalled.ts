import { Effect, FileSystem, Path } from "effect";
import { homedir } from "node:os";
import { SKILL_INSTALL_DIRS, SKILL_NAME } from "./constants";

const isInstalledAt = Effect.fn("flatmaxx.skills.isInstalledAt")(function* (
  base: string,
) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const present = yield* Effect.forEach(SKILL_INSTALL_DIRS, (dir) =>
    fs.exists(path.join(base, dir, SKILL_NAME)),
  );
  return present.includes(true);
});

export const isSkillInstalledInProject = (cwd: string) => isInstalledAt(cwd);

export const isSkillInstalledGlobally = Effect.fn(
  "flatmaxx.skills.isInstalledGlobally",
)(function* () {
  const home = yield* Effect.sync(() => homedir());
  return yield* isInstalledAt(home);
});
