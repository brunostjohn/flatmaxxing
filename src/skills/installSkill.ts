import { SkillInstallError } from "@/errors";
import { Effect } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process";
import { NPX_COMMAND, SKILL_AGENT_TARGETS, SKILL_SOURCE } from "./constants";
import type { InstallSkillOptions } from "./types";

export const buildSkillInstallArgs = ({
  global,
}: {
  readonly global: boolean;
}) =>
  [
    "-y",
    "skills",
    "add",
    SKILL_SOURCE,
    "-a",
    ...SKILL_AGENT_TARGETS,
    "-y",
    "--copy",
    ...(global ? ["-g"] : []),
  ] as const;

export const installSkill = Effect.fn("flatmaxx.skills.install")(function* ({
  cwd,
  global,
}: InstallSkillOptions) {
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
  const exitCode = yield* spawner
    .exitCode(
      ChildProcess.make(NPX_COMMAND, [...buildSkillInstallArgs({ global })], {
        cwd,
        stdin: "inherit",
        stdout: "inherit",
        stderr: "inherit",
      }),
    )
    .pipe(
      Effect.mapError(
        (cause) =>
          new SkillInstallError({
            message: "Failed to run `npx skills add`.",
            cause,
          }),
      ),
    );

  if (exitCode === 0) {
    return;
  }

  return yield* Effect.fail(
    new SkillInstallError({
      message: `\`npx skills add\` exited with code ${exitCode}.`,
    }),
  );
});
