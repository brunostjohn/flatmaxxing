import { CliError } from "@/errors";
import { installSkill, isNpxAvailable } from "@/skills";
import { Effect } from "effect";
import { Command, Flag } from "effect/unstable/cli";
import { homedir } from "node:os";

const globalFlag = Flag.boolean("global").pipe(
  Flag.withAlias("-g"),
  Flag.withDescription(
    "Install for the current user (global) instead of the current project.",
  ),
);

const installSubcommand = Command.make(
  "install",
  { global: globalFlag },
  Effect.fn("flatmaxx.skills.install.command")(function* (input: {
    readonly global: boolean;
  }) {
    if (!(yield* isNpxAvailable())) {
      return yield* Effect.fail(
        new CliError({
          message:
            "npx was not found on PATH. Install Node.js/npm to use `flatmaxx skills install`.",
        }),
      );
    }

    const cwd = yield* Effect.sync(() =>
      input.global ? homedir() : process.cwd(),
    );

    yield* Effect.sync(() =>
      console.log(
        input.global
          ? "Installing the flatmaxxing skill globally…"
          : "Installing the flatmaxxing skill…",
      ),
    );
    yield* installSkill({ cwd, global: input.global });
    yield* Effect.sync(() => console.log("Installed the flatmaxxing skill."));
  }),
).pipe(
  Command.withDescription(
    "Installs the flatmaxxing agent skill into the current project (or globally with --global).",
  ),
  Command.withShortDescription("Installs the flatmaxxing agent skill."),
);

export const makeSkillsCommand = () =>
  Command.make("skills").pipe(
    Command.withDescription("Manages the flatmaxxing agent skill."),
    Command.withSubcommands([installSubcommand]),
  );
