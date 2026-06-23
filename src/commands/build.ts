import {
  buildAlignmentDrillCategorizationOptions,
  buildBoardValidationOptions,
  buildDrillCategorizationOptions,
  buildEdgeCutDxfOptions,
  buildElectroplatingReportOptions,
  buildIsolationValidationOptions,
  buildKicadOutputOptions,
  buildMakeracamStepOptions,
  buildXToolProjectOptions,
} from "@/config";
import { resetSteps } from "@/inkHelpers";
import { runPreflight } from "@/preflight";
import {
  buildCncJobOptions,
  categorizeAlignmentDrills,
  categorizeDrills,
  createXtoolProjects,
  generateCncJobs,
  generateEdgeCutDxfs,
  generateElectroplatingReport,
  generateKicadOutputs,
  runFinalCut,
  runPlatedHoles,
  validateIsolation,
  validateKicadBoard,
} from "@/stages";
import { Effect } from "effect";
import { Command } from "effect/unstable/cli";
import { join } from "node:path";
import {
  type FlatmaxxCliInput,
  type ProjectCliInput,
  type SharedCliInput,
  loadConfigFromCli,
  mergeWithParentInput,
  prepareProjectContext,
  projectArgument,
  resolveFlatcam,
  sharedFlags,
} from "./helpers";

export const runBuildWorkflow = Effect.fn("flatmaxx.build")(function* (
  input: FlatmaxxCliInput,
) {
  yield* Effect.sync(resetSteps);

  const config = yield* loadConfigFromCli(input);
  yield* runPreflight(config);
  const { kicadCli, pcbFile, pcbName } = yield* prepareProjectContext(
    input,
    config,
  );
  const flatcam = resolveFlatcam(config);

  yield* validateKicadBoard(pcbFile, buildBoardValidationOptions(config));

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

  yield* generateCncJobs(flatcam, pcbFile, buildCncJobOptions(config));

  yield* categorizeAlignmentDrills(
    pcbFile,
    buildAlignmentDrillCategorizationOptions(config),
  );

  yield* generateEdgeCutDxfs(pcbFile, buildEdgeCutDxfOptions(config));

  yield* generateElectroplatingReport(
    pcbFile,
    buildElectroplatingReportOptions(config),
  );

  yield* createXtoolProjects(
    input.kicadProject,
    pcbName,
    buildXToolProjectOptions(config),
  );

  const makeracamEnabled =
    config.makeracam.platedHoles.generate || config.makeracam.finalCut.generate;
  const contourMillDiameter = makeracamEnabled
    ? Math.max(...config.cnc.availableMills.map((mill) => mill.diameter))
    : 0;
  yield* runPlatedHoles(
    pcbName,
    join(config.paths.gerbers, `${pcbName}-PTH_EdgeCuts.dxf`),
    contourMillDiameter,
    buildMakeracamStepOptions(config, "plated"),
  );
  yield* runFinalCut(
    pcbName,
    join(config.paths.gerbers, `${pcbName}-Final_EdgeCuts.dxf`),
    contourMillDiameter,
    buildMakeracamStepOptions(config, "final"),
  );
});

export const rootBuildCommand = Command.make(
  "flatmaxx",
  {
    kicadProject: projectArgument,
  },
  (input) => runBuildWorkflow(input as FlatmaxxCliInput),
).pipe(Command.withSharedFlags(sharedFlags));

export const makeBuildCommand = (parentCommand: typeof rootBuildCommand) =>
  Command.make(
    "build",
    {
      kicadProject: projectArgument,
    },
    Effect.fn("flatmaxx.build.command")(function* (input: ProjectCliInput) {
      const parent = (yield* parentCommand) as SharedCliInput;
      yield* runBuildWorkflow(mergeWithParentInput(input, parent));
    }),
  ).pipe(
    Command.withDescription("Creates CNC files from a KiCAD project."),
    Command.withShortDescription("Creates CNC files from a KiCAD project."),
  );
