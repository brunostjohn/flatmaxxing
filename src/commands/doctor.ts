import { runPreflight } from "@/preflight";
import { Effect } from "effect";
import { Command } from "effect/unstable/cli";
import {
  type ProjectCliInput,
  type SharedCliInput,
  loadConfigFromCli,
  mergeWithParentInput,
  projectArgument,
} from "./helpers";
import type { rootBuildCommand } from "./build";

export const makeDoctorCommand = (parentCommand: typeof rootBuildCommand) =>
  Command.make(
    "doctor",
    {
      kicadProject: projectArgument,
    },
    Effect.fn("flatmaxx.doctor")(function* (input: ProjectCliInput) {
      const parent = (yield* parentCommand) as SharedCliInput;
      const config = yield* loadConfigFromCli(
        mergeWithParentInput(input, parent),
      );

      yield* runPreflight(config, {
        title: "flatmaxx doctor",
      });
    }),
  ).pipe(
    Command.withDescription(
      "Checks whether the required flatmaxx software and macOS permissions are available.",
    ),
  );
