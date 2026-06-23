import {
  buildAlignmentDrillCategorizationOptions,
  buildBoardValidationOptions,
  buildDrillCategorizationOptions,
  buildIsolationValidationOptions,
  buildKicadOutputOptions,
  buildXToolProjectOptions,
} from "@/config";
import { resetSteps } from "@/inkHelpers";
import {
  buildPlannedAlignmentDrillOptions,
  categorizeAlignmentDrills,
  categorizeDrills,
  generateKicadOutputs,
  validateIsolation,
  validateKicadBoard,
  validateXToolAssets,
  writePlannedAlignmentDrillFile,
} from "@/stages";
import { Effect } from "effect";
import { Command, Flag } from "effect/unstable/cli";
import {
  type FlatmaxxCliInput,
  type ProjectCliInput,
  type SharedCliInput,
  loadConfigFromCli,
  mergeWithParentInput,
  prepareProjectContext,
  projectArgument,
} from "./helpers";
import type { rootBuildCommand } from "./build";

export type ValidateCliInput = FlatmaxxCliInput & {
  readonly fix: boolean;
};

const fixFlag = Flag.boolean("fix").pipe(
  Flag.withDescription("Apply KiCad board fixes without prompting."),
);

export const runValidateWorkflow = Effect.fn("flatmaxx.validate")(function* (
  input: ValidateCliInput,
) {
  yield* Effect.sync(resetSteps);

  const config = yield* loadConfigFromCli(input);
  const { kicadCli, pcbFile, pcbName } = yield* prepareProjectContext(
    input,
    config,
    { checkKicad: true },
  );

  yield* validateKicadBoard(pcbFile, {
    ...buildBoardValidationOptions(config),
    autoFix: input.fix,
  });

  yield* generateKicadOutputs(
    kicadCli,
    input.kicadProject,
    pcbFile,
    buildKicadOutputOptions(config),
  );

  yield* categorizeDrills(pcbFile, buildDrillCategorizationOptions(config));

  yield* validateIsolation(
    kicadCli,
    pcbFile,
    buildIsolationValidationOptions(config),
  );

  yield* validateXToolAssets(
    input.kicadProject,
    pcbName,
    buildXToolProjectOptions(config),
  );

  const wroteAlignmentDrills = yield* writePlannedAlignmentDrillFile(
    pcbFile,
    buildPlannedAlignmentDrillOptions(config),
  );

  if (wroteAlignmentDrills) {
    yield* categorizeAlignmentDrills(
      pcbFile,
      buildAlignmentDrillCategorizationOptions(config),
    );
  }
});

export const makeValidateCommand = (parentCommand: typeof rootBuildCommand) =>
  Command.make(
    "validate",
    {
      kicadProject: projectArgument,
      fix: fixFlag,
    },
    Effect.fn("flatmaxx.validate.command")(function* (
      input: ProjectCliInput & { readonly fix: boolean },
    ) {
      const parent = (yield* parentCommand) as SharedCliInput;
      yield* runValidateWorkflow({
        ...mergeWithParentInput(input, parent),
        fix: input.fix,
      });
    }),
  ).pipe(
    Command.withDescription(
      "Runs validation checks and refreshes KiCad outputs without launching FlatCAM, xTool Studio, or MakeraCAM.",
    ),
    Command.withShortDescription("Runs validation checks only."),
  );
