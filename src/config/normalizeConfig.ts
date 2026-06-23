import type { ConfigFile } from "@/config/schema";
import { resolveFrom } from "./paths";
import type {
  CncSettingOptions,
  CncToolOptions,
  Range,
  ResolvedConfig,
} from "./types";

class ConfigValidationError extends Error {
  constructor(readonly errors: readonly string[]) {
    super(
      `Invalid flatmaxxing config:\n${errors.map((e) => `- ${e}`).join("\n")}`,
    );
    this.name = "ConfigValidationError";
  }
}

const assertRangeShape = (range: Range, path: string, errors: string[]) => {
  if (!Number.isFinite(range.min)) {
    errors.push(`${path}.min must be finite.`);
  }
  if (!Number.isFinite(range.max)) {
    errors.push(`${path}.max must be finite.`);
  }
  if (range.min > range.max) {
    errors.push(`${path}.min must be less than or equal to ${path}.max.`);
  }
};

const assertInRange = (
  value: number,
  range: Range,
  path: string,
  errors: string[],
) => {
  if (!Number.isFinite(value)) {
    errors.push(`${path} must be finite.`);
    return;
  }

  if (value < range.min || value > range.max) {
    errors.push(`${path} must be between ${range.min} and ${range.max}.`);
  }
};

const validateTool = (
  tool: CncToolOptions | undefined,
  ranges: ResolvedConfig["validation"]["ranges"],
  path: string,
  errors: string[],
) => {
  if (!tool) {
    return;
  }

  assertInRange(
    tool.diameter,
    ranges.toolDiameterMm,
    `${path}.diameter`,
    errors,
  );

  if (tool.type === "vbit") {
    assertInRange(tool.angle, ranges.angleDegrees, `${path}.angle`, errors);
  }
};

const validateCncSetting = (
  setting: CncSettingOptions | undefined,
  ranges: ResolvedConfig["validation"]["ranges"],
  path: string,
  errors: string[],
) => {
  if (!setting) {
    return;
  }

  assertInRange(setting.feedRate, ranges.feedRate, `${path}.feedRate`, errors);
  assertInRange(
    setting.spindleSpeed,
    ranges.spindleSpeed,
    `${path}.spindleSpeed`,
    errors,
  );
  assertInRange(
    setting.zCutDepth,
    ranges.cutDepthMm,
    `${path}.zCutDepth`,
    errors,
  );
  assertInRange(
    setting.zCutFeedRate,
    ranges.feedRate,
    `${path}.zCutFeedRate`,
    errors,
  );
  validateTool(setting.tool, ranges, `${path}.tool`, errors);
};

export const validateResolvedConfig = (config: ResolvedConfig) => {
  const errors: string[] = [];
  const { ranges } = config.validation;

  for (const [key, range] of Object.entries(ranges)) {
    assertRangeShape(range, `validation.ranges.${key}`, errors);
  }

  assertInRange(
    config.alignmentDrills.distance.x,
    ranges.distanceMm,
    "alignmentDrills.distance.x",
    errors,
  );
  assertInRange(
    config.alignmentDrills.distance.y,
    ranges.distanceMm,
    "alignmentDrills.distance.y",
    errors,
  );

  for (const edge of ["left", "right", "top", "bottom"] as const) {
    assertInRange(
      config.electroplating.additionalDistance[edge],
      ranges.distanceMm,
      `electroplating.additionalDistance.${edge}`,
      errors,
    );
  }
  assertInRange(
    config.electroplating.cornerRadius,
    ranges.distanceMm,
    "electroplating.cornerRadius",
    errors,
  );
  assertInRange(
    config.electroplating.container.waterMl,
    ranges.electroplatingVolumeMl,
    "electroplating.container.waterMl",
    errors,
  );
  if (config.electroplating.container.maxBoardWidthMm !== undefined) {
    assertInRange(
      config.electroplating.container.maxBoardWidthMm,
      ranges.electroplatingBoardSizeMm,
      "electroplating.container.maxBoardWidthMm",
      errors,
    );
  }
  if (config.electroplating.container.maxBoardHeightMm !== undefined) {
    assertInRange(
      config.electroplating.container.maxBoardHeightMm,
      ranges.electroplatingBoardSizeMm,
      "electroplating.container.maxBoardHeightMm",
      errors,
    );
  }
  if (
    (config.electroplating.container.maxBoardWidthMm === undefined) !==
    (config.electroplating.container.maxBoardHeightMm === undefined)
  ) {
    errors.push(
      "electroplating.container.maxBoardWidthMm and maxBoardHeightMm must be configured together.",
    );
  }
  assertInRange(
    config.electroplating.recipe.currentDensityMaPerCm2,
    ranges.electroplatingCurrentDensityMaPerCm2,
    "electroplating.recipe.currentDensityMaPerCm2",
    errors,
  );
  assertInRange(
    config.electroplating.recipe.durationMinutes,
    ranges.electroplatingDurationMinutes,
    "electroplating.recipe.durationMinutes",
    errors,
  );
  assertInRange(
    config.electroplating.recipe.stirRpm,
    ranges.electroplatingStirRpm,
    "electroplating.recipe.stirRpm",
    errors,
  );
  assertInRange(
    config.electroplating.recipe.targetCopperMicrons,
    ranges.electroplatingMicrons,
    "electroplating.recipe.targetCopperMicrons",
    errors,
  );
  assertInRange(
    config.electroplating.recipe.voltageLimitV,
    ranges.electroplatingVoltageV,
    "electroplating.recipe.voltageLimitV",
    errors,
  );
  assertInRange(
    config.electroplating.recipe.copperSulfatePentahydrate.gramsPerLiter,
    ranges.electroplatingMassGramsPerLiter,
    "electroplating.recipe.copperSulfatePentahydrate.gramsPerLiter",
    errors,
  );
  assertInRange(
    config.electroplating.recipe.citricAcid.gramsPerLiter,
    ranges.electroplatingMassGramsPerLiter,
    "electroplating.recipe.citricAcid.gramsPerLiter",
    errors,
  );
  assertInRange(
    config.electroplating.recipe.polysorbate20.millilitersPerLiter,
    ranges.electroplatingLiquidMillilitersPerLiter,
    "electroplating.recipe.polysorbate20.millilitersPerLiter",
    errors,
  );
  assertInRange(
    config.electroplating.recipe.hcl.solutionConcentrationPercent,
    ranges.electroplatingConcentrationPercent,
    "electroplating.recipe.hcl.solutionConcentrationPercent",
    errors,
  );
  assertInRange(
    config.electroplating.recipe.hcl.referenceConcentrationPercent,
    ranges.electroplatingConcentrationPercent,
    "electroplating.recipe.hcl.referenceConcentrationPercent",
    errors,
  );
  assertInRange(
    config.electroplating.recipe.hcl.referenceMillilitersPerLiter,
    ranges.electroplatingLiquidMillilitersPerLiter,
    "electroplating.recipe.hcl.referenceMillilitersPerLiter",
    errors,
  );

  assertInRange(
    config.solderMask.distance.x,
    ranges.distanceMm,
    "solderMask.distance.x",
    errors,
  );
  assertInRange(
    config.solderMask.distance.y,
    ranges.distanceMm,
    "solderMask.distance.y",
    errors,
  );
  assertInRange(
    config.solderMask.xtool.intensity,
    ranges.xtoolPercent,
    "solderMask.xtool.intensity",
    errors,
  );
  assertInRange(
    config.solderMask.xtool.passes,
    ranges.xtoolPasses,
    "solderMask.xtool.passes",
    errors,
  );
  assertInRange(
    config.stencil.xtool.power,
    ranges.xtoolPercent,
    "stencil.xtool.power",
    errors,
  );
  assertInRange(
    config.stencil.xtool.speed,
    ranges.xtoolSpeed,
    "stencil.xtool.speed",
    errors,
  );
  assertInRange(
    config.stencil.xtool.passes,
    ranges.xtoolPasses,
    "stencil.xtool.passes",
    errors,
  );

  validateCncSetting(config.cnc.isolation, ranges, "cnc.isolation", errors);
  validateCncSetting(
    config.cnc.nonCopperClearing,
    ranges,
    "cnc.nonCopperClearing",
    errors,
  );

  config.cnc.availableDrills?.forEach((drill, index) =>
    assertInRange(
      drill.diameter,
      ranges.toolDiameterMm,
      `cnc.availableDrills.${index}.diameter`,
      errors,
    ),
  );
  config.cnc.availableMills?.forEach((mill, index) =>
    assertInRange(
      mill.diameter,
      ranges.toolDiameterMm,
      `cnc.availableMills.${index}.diameter`,
      errors,
    ),
  );

  if (
    (config.makeracam.platedHoles.generate ||
      config.makeracam.finalCut.generate) &&
    config.cnc.availableMills.length === 0
  ) {
    errors.push(
      "cnc.availableMills must include at least one mill when MakerCAM platedHoles or finalCut generation is enabled.",
    );
  }

  if (errors.length > 0) {
    throw new ConfigValidationError(errors);
  }
};

export const normalizeConfig = (config: ConfigFile, configRoot: string) => {
  const resolvedConfigRoot = resolveFrom(process.cwd(), configRoot);
  const resolvedProjectDir = resolveFrom(resolvedConfigRoot, config.projectDir);
  const resolved: ResolvedConfig = {
    projectDir: resolvedProjectDir,
    skipRenderBoard: config.skipRenderBoard,
    dependencies: config.dependencies,
    paths: {
      additionalProjects: resolveFrom(
        resolvedProjectDir,
        config.paths.additionalProjects,
      ),
      gcode: resolveFrom(resolvedProjectDir, config.paths.gcode),
      svg: resolveFrom(resolvedProjectDir, config.paths.svg),
      dxf: resolveFrom(resolvedProjectDir, config.paths.dxf),
      png: resolveFrom(resolvedProjectDir, config.paths.png),
      gerbers: resolveFrom(resolvedProjectDir, config.paths.gerbers),
      drills: resolveFrom(resolvedProjectDir, config.paths.drills),
      xtool: resolveFrom(resolvedProjectDir, config.paths.xtool),
      place: resolveFrom(resolvedProjectDir, config.paths.place),
      cnc: resolveFrom(resolvedProjectDir, config.paths.cnc),
    },
    board: {
      ...config.board,
      file: config.board.file
        ? resolveFrom(resolvedProjectDir, config.board.file)
        : undefined,
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

  validateResolvedConfig(resolved);
  return resolved;
};
