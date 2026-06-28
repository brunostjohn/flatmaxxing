import type { ResolvedConfig } from "@/config";
import { CliError } from "@/errors";
import { renderBoardHeader } from "@/stages";
import { ROUNDED_UP_FILE } from "@/stages/categorizeDrills/constants";
import { PLATING_REPORT_FILE } from "@/stages/electroplating/constants";
import { Array, Effect, FileSystem, Path, Record } from "effect";
import { Command, Flag } from "effect/unstable/cli";
import {
  type FlatmaxxCliInput,
  type ProjectCliInput,
  type SharedCliInput,
  loadConfigFromCli,
  mergeWithParentInput,
  projectArgument,
  resolveBoardImagePngPath,
} from "./helpers";
import type { rootBuildCommand } from "./build";

export type CleanCliInput = FlatmaxxCliInput & {
  readonly dryRun: boolean;
};

export interface CleanResult {
  readonly removed: readonly string[];
  readonly dryRun: boolean;
}

const looseOutputFiles = [ROUNDED_UP_FILE, PLATING_REPORT_FILE];

const dryRunFlag = Flag.boolean("dry-run").pipe(
  Flag.withDescription(
    "List the outputs that would be removed without deleting them.",
  ),
);

const outputDirs = (config: ResolvedConfig) =>
  Array.map(Record.toEntries(config.paths), ([, dir]) => dir);

const summarize = (
  projectDir: string,
  dryRun: boolean,
  lines: readonly string[],
) => {
  if (lines.length === 0) {
    return `No flatmaxx outputs found in ${projectDir}.`;
  }

  const verb = dryRun ? "Would remove" : "Removed";
  const body = Array.map(lines, (line) => `  ${line}`).join("\n");
  return `${verb} ${lines.length} flatmaxx output(s):\n${body}`;
};

export const cleanProjectOutputs = Effect.fn("flatmaxx.clean.outputs")(
  function* (config: ResolvedConfig, options: { readonly dryRun: boolean }) {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const isInsideProject = (target: string) => {
      const rel = path.relative(config.projectDir, target);
      return rel !== "" && !rel.startsWith("..");
    };
    const targets = Array.filter(
      [
        ...outputDirs(config),
        ...Array.map(looseOutputFiles, (name) =>
          path.join(config.projectDir, name),
        ),
      ],
      isInsideProject,
    );
    const existing = yield* Effect.filter(targets, (target) =>
      fs.exists(target),
    );

    if (!options.dryRun) {
      yield* Effect.forEach(existing, (target) =>
        fs
          .remove(target, { recursive: true, force: true })
          .pipe(
            Effect.mapError(
              (cause) =>
                new CliError({ message: `Failed to remove ${target}.`, cause }),
            ),
          ),
      );
    }

    return { removed: existing, dryRun: options.dryRun } satisfies CleanResult;
  },
);

export const runCleanWorkflow = Effect.fn("flatmaxx.clean")(function* (
  input: CleanCliInput,
) {
  const path = yield* Path.Path;
  const config = yield* loadConfigFromCli(input);
  yield* renderBoardHeader(yield* resolveBoardImagePngPath(config));
  const result = yield* cleanProjectOutputs(config, { dryRun: input.dryRun });
  const lines = Array.map(result.removed, (target) => {
    const rel = path.relative(config.projectDir, target);
    return rel === "" ? target : rel;
  });

  yield* Effect.sync(() =>
    console.log(summarize(config.projectDir, result.dryRun, lines)),
  );
});

export const makeCleanCommand = (parentCommand: typeof rootBuildCommand) =>
  Command.make(
    "clean",
    {
      kicadProject: projectArgument,
      dryRun: dryRunFlag,
    },
    Effect.fn("flatmaxx.clean.command")(function* (
      input: ProjectCliInput & { readonly dryRun: boolean },
    ) {
      const parent = (yield* parentCommand) as SharedCliInput;
      yield* runCleanWorkflow({
        ...mergeWithParentInput(input, parent),
        dryRun: input.dryRun,
      });
    }),
  ).pipe(
    Command.withDescription(
      "Removes all generated flatmaxx output folders and files from the project directory.",
    ),
    Command.withShortDescription("Removes generated flatmaxx outputs."),
  );
