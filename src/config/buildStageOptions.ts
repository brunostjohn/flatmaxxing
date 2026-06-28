import { effectiveToolDiameter } from "@/cnc/effectiveToolDiameter";
import { Array, Match, Record, Result } from "effect";
import type { ElectroplatingReportOptions } from "@/stages/electroplating/generateElectroplatingReport";
import type { MakeracamStep } from "@/stages/makeracam/types";
import type { ResolvedConfig, Side } from "./types";

const allSides = ["front", "back"] as const satisfies readonly Side[];

const sideToCopperLayer: Record<Side, string> = {
  front: "F.Cu",
  back: "B.Cu",
};

export const enabledSidesFromConfig = (config: ResolvedConfig) =>
  config.board.ignoreSide === null
    ? allSides
    : allSides.filter((side) => side !== config.board.ignoreSide);

const withoutExcludedSides = (
  sides: readonly Side[],
  excludeSides: readonly Side[],
) => sides.filter((side) => !excludeSides.includes(side));

const workflowSkipReason = (
  generate: boolean,
  sides: readonly Side[],
  workflowName: "solderMask" | "stencil",
) => {
  if (!generate) {
    return `${workflowName}.generate=false`;
  }

  if (sides.length === 0) {
    return `${workflowName}.excludeSides excludes all enabled board sides`;
  }

  return undefined;
};

const sideSkipReason = (
  side: Side,
  boardSides: readonly Side[],
  excludeSides: readonly Side[],
  workflowName: "solderMask" | "stencil",
): Result.Result<readonly [Side, string], null> =>
  Match.value({
    ignored: !boardSides.includes(side),
    excluded: excludeSides.includes(side),
  }).pipe(
    Match.when({ ignored: true }, () =>
      Result.succeed([side, `board.ignoreSide=${side}`] as const),
    ),
    Match.when({ excluded: true }, () =>
      Result.succeed([
        side,
        `${workflowName}.excludeSides includes ${side}`,
      ] as const),
    ),
    Match.orElse(() => Result.fail(null)),
  );

const sideSkipStatus = (
  boardSides: readonly Side[],
  excludeSides: readonly Side[],
  workflowName: "solderMask" | "stencil",
): Partial<Record<Side, string>> =>
  Record.fromEntries(
    Array.filterMap(allSides, (side) =>
      sideSkipReason(side, boardSides, excludeSides, workflowName),
    ),
  );

export const buildBoardSelectionOptions = (config: ResolvedConfig) => ({
  boardFile: config.board.file,
});

export const buildBoardValidationOptions = (config: ResolvedConfig) => ({
  autoFix: config.board.autoFix,
  platingBath: {
    maxBoardWidthMm: config.electroplating.container.maxBoardWidthMm,
    maxBoardHeightMm: config.electroplating.container.maxBoardHeightMm,
    allowRotation: config.electroplating.container.allowRotation,
    platingOffsets: config.electroplating.additionalDistance,
    includeAlignmentDrills:
      config.electroplating.generateEdgeCutsWithAlignmentDrills &&
      config.alignmentDrills.generate,
    alignmentDistance: config.alignmentDrills.distance,
  },
});

export const buildKicadOutputOptions = (config: ResolvedConfig) => {
  const boardSides = enabledSidesFromConfig(config);
  const solderMaskSides = withoutExcludedSides(
    boardSides,
    config.solderMask.excludeSides,
  );
  const stencilSides = withoutExcludedSides(
    boardSides,
    config.stencil.excludeSides,
  );

  return {
    paths: {
      svg: config.paths.svg,
      dxf: config.paths.dxf,
      png: config.paths.png,
      gerbers: config.paths.gerbers,
      place: config.paths.place,
    },
    sides: boardSides,
    drills: config.drills,
    place: config.place,
    boardImage: {
      generate: !config.skipRenderBoard,
      skipReason: config.skipRenderBoard ? "skipRenderBoard=true" : undefined,
    },
    solderMask: {
      generate: config.solderMask.generate,
      sides: solderMaskSides,
      skipReason: workflowSkipReason(
        config.solderMask.generate,
        solderMaskSides,
        "solderMask",
      ),
    },
    stencil: {
      generate: config.stencil.generate,
      sides: stencilSides,
      skipReason: workflowSkipReason(
        config.stencil.generate,
        stencilSides,
        "stencil",
      ),
    },
  };
};

export const buildIsolationValidationOptions = (config: ResolvedConfig) => {
  const sides = enabledSidesFromConfig(config);
  const tool = config.cnc.isolation.tool;
  const cutDepth = config.cnc.isolation.zCutDepth;

  return {
    enabled:
      config.validation.isolationFeasibility.enabled && tool !== undefined,
    onFailure: config.validation.isolationFeasibility.onFailure,
    tool,
    cutDepth,
    effectiveDiameter: tool ? effectiveToolDiameter(tool, cutDepth) : 0,
    layers: sides.map((side) => sideToCopperLayer[side]),
    ignorePatterns: config.validation.isolationFeasibility.ignore,
  };
};

export const buildDrillCategorizationOptions = (config: ResolvedConfig) => ({
  enabled: config.validation.drillFeasibility.enabled,
  onFailure: config.validation.drillFeasibility.onFailure,
  drillsDir: config.paths.drills,
  gerbersDir: config.paths.gerbers,
  availableDrills: config.cnc.availableDrills,
  availableMills: config.cnc.availableMills,
  matchToleranceMm: config.cnc.drilling.matchToleranceMm,
});

export const buildAlignmentDrillCategorizationOptions = (
  config: ResolvedConfig,
) => ({
  enabled: config.alignmentDrills.generate,
  drillsDir: config.paths.drills,
  gerbersDir: config.paths.gerbers,
  availableDrills: config.cnc.availableDrills,
  availableMills: config.cnc.availableMills,
  matchToleranceMm: config.cnc.drilling.matchToleranceMm,
});

export const buildXToolProjectOptions = (config: ResolvedConfig) => {
  const boardSides = enabledSidesFromConfig(config);
  const solderMaskSides = withoutExcludedSides(
    boardSides,
    config.solderMask.excludeSides,
  );
  const stencilSides = withoutExcludedSides(
    boardSides,
    config.stencil.excludeSides,
  );
  const solderMaskSkipReason = workflowSkipReason(
    config.solderMask.generate,
    solderMaskSides,
    "solderMask",
  );
  const stencilSkipReason = workflowSkipReason(
    config.stencil.generate,
    stencilSides,
    "stencil",
  );
  const solderMaskEnabled = solderMaskSkipReason === undefined;
  const stencilEnabled = stencilSkipReason === undefined;

  return {
    enabled: solderMaskEnabled || stencilEnabled,
    outputPath: config.paths.xtool,
    lifecycle: {
      appPath: config.xtool.appPath,
      cdpHost: config.xtool.cdpHost,
      cdpPort: config.xtool.cdpPort,
      window: config.xtool.window,
    },
    solderMask: {
      enabled: solderMaskEnabled,
      skipReason: solderMaskSkipReason,
      sides: solderMaskSides,
      sideSkipStatus: sideSkipStatus(
        boardSides,
        config.solderMask.excludeSides,
        "solderMask",
      ),
      double: config.solderMask.double,
      distance: config.solderMask.distance,
      xtool: config.solderMask.xtool,
    },
    stencil: {
      enabled: stencilEnabled,
      skipReason: stencilSkipReason,
      sides: stencilSides,
      sideSkipStatus: sideSkipStatus(
        boardSides,
        config.stencil.excludeSides,
        "stencil",
      ),
      xtool: config.stencil.xtool,
    },
  };
};

export const buildEdgeCutDxfOptions = (config: ResolvedConfig) => ({
  enabled:
    config.makeracam.platedHoles.generate || config.makeracam.finalCut.generate,
  platingOffsets: config.electroplating.additionalDistance,
  cornerRadius: config.electroplating.cornerRadius,
  includeAlignmentDrills:
    config.electroplating.generateEdgeCutsWithAlignmentDrills &&
    config.alignmentDrills.generate,
  alignmentDistance: config.alignmentDrills.distance,
  gerbersDir: config.paths.gerbers,
});

export const buildElectroplatingReportOptions = (
  config: ResolvedConfig,
): ElectroplatingReportOptions => ({
  enabled:
    config.makeracam.platedHoles.generate || config.makeracam.finalCut.generate,
  platingOffsets: config.electroplating.additionalDistance,
  includeAlignmentDrills:
    config.electroplating.generateEdgeCutsWithAlignmentDrills &&
    config.alignmentDrills.generate,
  alignmentDistance: config.alignmentDrills.distance,
  container: config.electroplating.container,
  recipe: config.electroplating.recipe,
  projectDir: config.projectDir,
});

export const buildMakeracamStepOptions = (
  config: ResolvedConfig,
  step: MakeracamStep,
) => ({
  enabled:
    step === "plated"
      ? config.makeracam.platedHoles.generate
      : config.makeracam.finalCut.generate,
  step,
  appPath: config.makeracam.appPath,
  cutDepthMm: config.makeracam.cutDepthMm,
  tabsPerContour: config.makeracam.tabsPerContour,
  drillsDir: config.paths.drills,
  gcodeDir: config.paths.gcode,
  cncDir: config.paths.cnc,
  windowBounds: {
    x: 0,
    y: 33,
    w: config.makeracam.window.width,
    h: config.makeracam.window.height,
  },
});
