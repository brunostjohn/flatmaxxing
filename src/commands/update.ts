import { runUpdate } from "@/update";
import { Effect } from "effect";
import { Command, Flag } from "effect/unstable/cli";

const checkFlag = Flag.boolean("check").pipe(
  Flag.withDescription(
    "Check whether a newer release is available without installing it.",
  ),
);

const forceFlag = Flag.boolean("force").pipe(
  Flag.withDescription(
    "Reinstall the latest release even when it matches the current version.",
  ),
);

export const makeUpdateCommand = () =>
  Command.make(
    "update",
    { check: checkFlag, force: forceFlag },
    Effect.fn("flatmaxx.update.command")(function* (input: {
      readonly check: boolean;
      readonly force: boolean;
    }) {
      yield* runUpdate({ check: input.check, force: input.force });
    }),
  ).pipe(
    Command.withDescription(
      "Downloads and installs the latest flatmaxx release from GitHub.",
    ),
    Command.withShortDescription("Updates flatmaxx to the latest release."),
  );
