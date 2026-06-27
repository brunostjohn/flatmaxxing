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
  getBoardImagePngPath,
  renderBoardImagePreview,
  runFinalCut,
  runPlatedHoles,
  validateIsolation,
  validateKicadBoard,
} from "@/stages";
import { Effect, FileSystem, Path } from "effect";
import { Command } from "effect/unstable/cli";
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

export type BoardImagePreviewRenderer = (
  pngPath: string,
) => Effect.Effect<void>;

export interface MaybeRenderBoardImagePreviewOptions {
  readonly enabled: boolean;
  readonly pngPath?: string;
  readonly alreadyShown?: boolean;
  readonly isInteractive?: boolean;
  readonly renderPreview?: BoardImagePreviewRenderer;
}

export const maybeRenderBoardImagePreview = Effect.fn(
  "flatmaxx.build.maybeRenderBoardImagePreview",
)(function* ({
  enabled,
  pngPath,
  alreadyShown = false,
  isInteractive = process.stdout.isTTY === true,
  renderPreview = renderBoardImagePreview,
}: MaybeRenderBoardImagePreviewOptions) {
  const fs = yield* FileSystem.FileSystem;

  if (!enabled || alreadyShown || !pngPath || !isInteractive) {
    return false;
  }

  const exists = yield* fs.exists(pngPath);

  if (!exists) {
    return false;
  }

  yield* renderPreview(pngPath);
  return true;
});

export const runBuildWorkflow = Effect.fn("flatmaxx.build")(function* (
  input: FlatmaxxCliInput,
) {
  const path = yield* Path.Path;
  yield* Effect.sync(resetSteps);

  const config = yield* loadConfigFromCli(input);
  const { kicadCli, pcbFile, pcbName, projectDir } =
    yield* prepareProjectContext(config);
  const flatcam = resolveFlatcam(config);
  const showedBoardImagePreview = yield* maybeRenderBoardImagePreview({
    enabled: !config.skipRenderBoard,
    pngPath: getBoardImagePngPath(config.paths.png, pcbName),
  });

  yield* runPreflight(config);

  yield* validateKicadBoard(pcbFile, buildBoardValidationOptions(config));

  const kicadOutputs = yield* generateKicadOutputs(
    kicadCli,
    projectDir,
    pcbFile,
    buildKicadOutputOptions(config),
  );
  yield* maybeRenderBoardImagePreview({
    enabled: !config.skipRenderBoard,
    alreadyShown: showedBoardImagePreview,
    pngPath: kicadOutputs.boardImagePngPath,
  });

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
    projectDir,
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
    path.join(config.paths.gerbers, `${pcbName}-PTH_EdgeCuts.dxf`),
    contourMillDiameter,
    buildMakeracamStepOptions(config, "plated"),
  );
  yield* runFinalCut(
    pcbName,
    path.join(config.paths.gerbers, `${pcbName}-Final_EdgeCuts.dxf`),
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
