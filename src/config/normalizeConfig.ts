import { ConfigValidationError } from "@/errors";
import type { ConfigFile } from "@/config/schema";
import { Array, Effect, Match, Option, Record } from "effect";
import { resolveFrom } from "./paths";
import type {
  CncSettingOptions,
  CncToolOptions,
  Range,
  ResolvedConfig,
} from "./types";

const rangeShapeErrors = (range: Range, path: string): readonly string[] => [
  ...(Number.isFinite(range.min) ? [] : [`${path}.min must be finite.`]),
  ...(Number.isFinite(range.max) ? [] : [`${path}.max must be finite.`]),
  ...(range.min > range.max
    ? [`${path}.min must be less than or equal to ${path}.max.`]
    : []),
];

const inRangeErrors = (
  value: number,
  range: Range,
  path: string,
): readonly string[] =>
  Match.value(Number.isFinite(value)).pipe(
    Match.when(false, () => [`${path} must be finite.`]),
    Match.orElse(() =>
      value < range.min || value > range.max
        ? [`${path} must be between ${range.min} and ${range.max}.`]
        : [],
    ),
  );

const toolErrors = (
  tool: CncToolOptions | undefined,
  ranges: ResolvedConfig["validation"]["ranges"],
  path: string,
): readonly string[] =>
  Option.match(Option.fromUndefinedOr(tool), {
    onNone: () => [],
    onSome: (resolvedTool) => [
      ...inRangeErrors(
        resolvedTool.diameter,
        ranges.toolDiameterMm,
        `${path}.diameter`,
      ),
      ...(resolvedTool.type === "vbit"
        ? inRangeErrors(
            resolvedTool.angle,
            ranges.angleDegrees,
            `${path}.angle`,
          )
        : []),
    ],
  });

const cncSettingErrors = (
  setting: CncSettingOptions | undefined,
  ranges: ResolvedConfig["validation"]["ranges"],
  path: string,
): readonly string[] =>
  Option.match(Option.fromUndefinedOr(setting), {
    onNone: () => [],
    onSome: (resolved) => [
      ...inRangeErrors(resolved.feedRate, ranges.feedRate, `${path}.feedRate`),
      ...inRangeErrors(
        resolved.spindleSpeed,
        ranges.spindleSpeed,
        `${path}.spindleSpeed`,
      ),
      ...inRangeErrors(
        resolved.zCutDepth,
        ranges.cutDepthMm,
        `${path}.zCutDepth`,
      ),
      ...inRangeErrors(
        resolved.zCutFeedRate,
        ranges.feedRate,
        `${path}.zCutFeedRate`,
      ),
      ...toolErrors(resolved.tool, ranges, `${path}.tool`),
    ],
  });

const platingBathPairErrors = (
  container: ResolvedConfig["electroplating"]["container"],
): readonly string[] =>
  (container.maxBoardWidthMm === undefined) !==
  (container.maxBoardHeightMm === undefined)
    ? [
        "electroplating.container.maxBoardWidthMm and maxBoardHeightMm must be configured together.",
      ]
    : [];

const millRequirementErrors = (config: ResolvedConfig): readonly string[] =>
  (config.makeracam.platedHoles.generate ||
    config.makeracam.finalCut.generate) &&
  config.cnc.availableMills.length === 0
    ? [
        "cnc.availableMills must include at least one mill when MakerCAM platedHoles or finalCut generation is enabled.",
      ]
    : [];

export const resolvedConfigErrors = (
  config: ResolvedConfig,
): readonly string[] => {
  const { ranges } = config.validation;
  const { additionalDistance, container, recipe } = config.electroplating;

  return [
    ...Array.flatMap(Record.toEntries(ranges), ([key, range]) =>
      rangeShapeErrors(range, `validation.ranges.${key}`),
    ),
    ...inRangeErrors(
      config.alignmentDrills.distance.x,
      ranges.distanceMm,
      "alignmentDrills.distance.x",
    ),
    ...inRangeErrors(
      config.alignmentDrills.distance.y,
      ranges.distanceMm,
      "alignmentDrills.distance.y",
    ),
    ...Array.flatMap(["left", "right", "top", "bottom"] as const, (edge) =>
      inRangeErrors(
        additionalDistance[edge],
        ranges.distanceMm,
        `electroplating.additionalDistance.${edge}`,
      ),
    ),
    ...inRangeErrors(
      config.electroplating.cornerRadius,
      ranges.distanceMm,
      "electroplating.cornerRadius",
    ),
    ...inRangeErrors(
      container.waterMl,
      ranges.electroplatingVolumeMl,
      "electroplating.container.waterMl",
    ),
    ...Option.match(Option.fromUndefinedOr(container.maxBoardWidthMm), {
      onNone: () => [],
      onSome: (value) =>
        inRangeErrors(
          value,
          ranges.electroplatingBoardSizeMm,
          "electroplating.container.maxBoardWidthMm",
        ),
    }),
    ...Option.match(Option.fromUndefinedOr(container.maxBoardHeightMm), {
      onNone: () => [],
      onSome: (value) =>
        inRangeErrors(
          value,
          ranges.electroplatingBoardSizeMm,
          "electroplating.container.maxBoardHeightMm",
        ),
    }),
    ...platingBathPairErrors(container),
    ...inRangeErrors(
      recipe.currentDensityMaPerCm2,
      ranges.electroplatingCurrentDensityMaPerCm2,
      "electroplating.recipe.currentDensityMaPerCm2",
    ),
    ...inRangeErrors(
      recipe.durationMinutes,
      ranges.electroplatingDurationMinutes,
      "electroplating.recipe.durationMinutes",
    ),
    ...inRangeErrors(
      recipe.stirRpm,
      ranges.electroplatingStirRpm,
      "electroplating.recipe.stirRpm",
    ),
    ...inRangeErrors(
      recipe.targetCopperMicrons,
      ranges.electroplatingMicrons,
      "electroplating.recipe.targetCopperMicrons",
    ),
    ...inRangeErrors(
      recipe.voltageLimitV,
      ranges.electroplatingVoltageV,
      "electroplating.recipe.voltageLimitV",
    ),
    ...inRangeErrors(
      recipe.copperSulfatePentahydrate.gramsPerLiter,
      ranges.electroplatingMassGramsPerLiter,
      "electroplating.recipe.copperSulfatePentahydrate.gramsPerLiter",
    ),
    ...inRangeErrors(
      recipe.citricAcid.gramsPerLiter,
      ranges.electroplatingMassGramsPerLiter,
      "electroplating.recipe.citricAcid.gramsPerLiter",
    ),
    ...inRangeErrors(
      recipe.polysorbate20.millilitersPerLiter,
      ranges.electroplatingLiquidMillilitersPerLiter,
      "electroplating.recipe.polysorbate20.millilitersPerLiter",
    ),
    ...inRangeErrors(
      recipe.hcl.solutionConcentrationPercent,
      ranges.electroplatingConcentrationPercent,
      "electroplating.recipe.hcl.solutionConcentrationPercent",
    ),
    ...inRangeErrors(
      recipe.hcl.referenceConcentrationPercent,
      ranges.electroplatingConcentrationPercent,
      "electroplating.recipe.hcl.referenceConcentrationPercent",
    ),
    ...inRangeErrors(
      recipe.hcl.referenceMillilitersPerLiter,
      ranges.electroplatingLiquidMillilitersPerLiter,
      "electroplating.recipe.hcl.referenceMillilitersPerLiter",
    ),
    ...inRangeErrors(
      config.solderMask.distance.x,
      ranges.distanceMm,
      "solderMask.distance.x",
    ),
    ...inRangeErrors(
      config.solderMask.distance.y,
      ranges.distanceMm,
      "solderMask.distance.y",
    ),
    ...inRangeErrors(
      config.solderMask.xtool.intensity,
      ranges.xtoolPercent,
      "solderMask.xtool.intensity",
    ),
    ...inRangeErrors(
      config.solderMask.xtool.passes,
      ranges.xtoolPasses,
      "solderMask.xtool.passes",
    ),
    ...inRangeErrors(
      config.stencil.xtool.power,
      ranges.xtoolPercent,
      "stencil.xtool.power",
    ),
    ...inRangeErrors(
      config.stencil.xtool.speed,
      ranges.xtoolSpeed,
      "stencil.xtool.speed",
    ),
    ...inRangeErrors(
      config.stencil.xtool.passes,
      ranges.xtoolPasses,
      "stencil.xtool.passes",
    ),
    ...cncSettingErrors(config.cnc.isolation, ranges, "cnc.isolation"),
    ...cncSettingErrors(
      config.cnc.nonCopperClearing,
      ranges,
      "cnc.nonCopperClearing",
    ),
    ...Array.flatMap(config.cnc.availableDrills, (drill, index) =>
      inRangeErrors(
        drill.diameter,
        ranges.toolDiameterMm,
        `cnc.availableDrills.${index}.diameter`,
      ),
    ),
    ...Array.flatMap(config.cnc.availableMills, (mill, index) =>
      inRangeErrors(
        mill.diameter,
        ranges.toolDiameterMm,
        `cnc.availableMills.${index}.diameter`,
      ),
    ),
    ...millRequirementErrors(config),
  ];
};

export const validateResolvedConfig = (config: ResolvedConfig) => {
  const errors = resolvedConfigErrors(config);

  return Match.value(errors.length > 0).pipe(
    Match.when(true, () =>
      Effect.fail(
        new ConfigValidationError({
          message: `Invalid flatmaxxing config:\n${errors.map((e) => `- ${e}`).join("\n")}`,
          errors,
        }),
      ),
    ),
    Match.orElse(() => Effect.void),
  );
};

export const normalizeConfig = Effect.fn("flatmaxx.config.normalize")(
  function* (config: ConfigFile, configRoot: string) {
    const cwd = yield* Effect.sync(() => process.cwd());
    const resolvedConfigRoot = yield* resolveFrom(cwd, configRoot);
    const resolvedProjectDir = yield* resolveFrom(
      resolvedConfigRoot,
      config.projectDir,
    );
    const fromProjectDir = (path: string) =>
      resolveFrom(resolvedProjectDir, path);
    const [
      additionalProjects,
      gcode,
      svg,
      dxf,
      png,
      gerbers,
      drills,
      xtool,
      place,
      cnc,
    ] = yield* Effect.all([
      fromProjectDir(config.paths.additionalProjects),
      fromProjectDir(config.paths.gcode),
      fromProjectDir(config.paths.svg),
      fromProjectDir(config.paths.dxf),
      fromProjectDir(config.paths.png),
      fromProjectDir(config.paths.gerbers),
      fromProjectDir(config.paths.drills),
      fromProjectDir(config.paths.xtool),
      fromProjectDir(config.paths.place),
      fromProjectDir(config.paths.cnc),
    ]);
    const boardFile = yield* Option.match(
      Option.fromUndefinedOr(config.board.file),
      {
        onNone: () => Effect.succeed(undefined),
        onSome: fromProjectDir,
      },
    );
    const resolved: ResolvedConfig = {
      projectDir: resolvedProjectDir,
      skipRenderBoard: config.skipRenderBoard,
      skills: config.skills,
      dependencies: config.dependencies,
      paths: {
        additionalProjects,
        gcode,
        svg,
        dxf,
        png,
        gerbers,
        drills,
        xtool,
        place,
        cnc,
      },
      board: {
        ...config.board,
        file: boardFile,
      },
      alignmentDrills: config.alignmentDrills,
      electroplating: config.electroplating,
      solderMask: config.solderMask,
      stencil: config.stencil,
      drills: config.drills,
      place: config.place,
      cnc: config.cnc,
      xtool: config.xtool,
      makeracam: config.makeracam,
      validation: config.validation,
    };

    yield* validateResolvedConfig(resolved);
    return resolved;
  },
);
