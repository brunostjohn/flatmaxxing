import {
  ConfigFileSchema,
  decodeConfig,
  deepMerge,
  defaultConfigFile,
  isRecord,
  loadConfigFile,
  normalizeConfig,
  readExtends,
  readToml,
  renderTomlAssignments,
  renderTomlInlineValue,
  renderTomlSection,
  resolveFrom,
  resolveSibling,
  type ConfigFile,
  type TomlValue,
} from "@/config";
import { Effect, Schema } from "effect";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { parse } from "toml";

export const projectConfigFilename = "flatmaxxing.toml";
export const userConfigFilename = "flatmaxxing.user.toml";
export const userConfigExtendsPath = `~/${userConfigFilename}`;

export type ConfigEditorMode = "project" | "user";
export type ConfigEditorFieldKind =
  | "boolean"
  | "float"
  | "integer"
  | "optionalFloat"
  | "optionalString"
  | "select"
  | "numberSelect"
  | "string"
  | "toml";

export type ConfigEditorSelectOption = {
  readonly label: string;
  readonly value: string;
};

export type ConfigEditorField = {
  readonly kind: ConfigEditorFieldKind;
  readonly path: readonly string[];
  readonly label: string;
  readonly description?: string | undefined;
  readonly min?: number | undefined;
  readonly max?: number | undefined;
  readonly step?: number | undefined;
  readonly options?: readonly ConfigEditorSelectOption[] | undefined;
  readonly placeholder?: string | undefined;
};

export type ConfigEditorSection = {
  readonly id: string;
  readonly title: string;
  readonly fields: readonly ConfigEditorField[];
};

export type ConfigEditorTarget = {
  readonly mode: ConfigEditorMode;
  readonly targetPath: string;
  readonly configRoot: string;
  readonly userConfigPath?: string | undefined;
  readonly baselineRaw: Record<string, unknown>;
  readonly currentRaw: Record<string, unknown>;
  readonly baselineConfig: ConfigFile;
  readonly currentConfig: ConfigFile;
};

export type PrepareConfigEditorTargetOptions = {
  readonly cwd?: string | undefined;
  readonly kicadProject?: string | undefined;
  readonly configPath?: string | undefined;
  readonly user?: boolean | undefined;
  readonly userConfigPath?: string | undefined;
};

const parseOptions = {
  errors: "all",
  onExcessProperty: "error",
} as const;

const pathKey = (path: readonly string[]) => path.join(".");

const field = (
  kind: ConfigEditorFieldKind,
  path: string,
  label: string,
  options: Omit<ConfigEditorField, "kind" | "path" | "label"> = {},
): ConfigEditorField => ({
  kind,
  path: path.split("."),
  label,
  ...options,
});

const option = (value: string, label = value): ConfigEditorSelectOption => ({
  label,
  value,
});

const sideArrayDescription = `TOML array, for example ["front"] or ["front", "back"].`;

export const configEditorSections = [
  {
    id: "project",
    title: "Project",
    fields: [
      field("toml", "extends", "Extends", {
        description: `TOML string array of parent config files.`,
      }),
      field("string", "projectDir", "Project directory"),
    ],
  },
  {
    id: "dependencies",
    title: "Dependencies",
    fields: [
      field("string", "dependencies.kicadCli", "KiCad CLI"),
      field("string", "dependencies.flatcam", "FlatCAM"),
    ],
  },
  {
    id: "paths",
    title: "Paths",
    fields: [
      field("string", "paths.additionalProjects", "Additional projects"),
      field("string", "paths.gcode", "G-code"),
      field("string", "paths.svg", "SVG"),
      field("string", "paths.dxf", "DXF"),
      field("string", "paths.png", "PNG"),
      field("string", "paths.gerbers", "Gerbers"),
      field("string", "paths.drills", "Drills"),
      field("string", "paths.xtool", "xTool"),
      field("string", "paths.place", "Place"),
      field("string", "paths.cnc", "CNC"),
    ],
  },
  {
    id: "board",
    title: "Board",
    fields: [
      field("boolean", "board.autoFix", "Auto-fix board"),
      field("optionalString", "board.file", "Board file"),
      field("select", "board.ignoreSide", "Ignored side", {
        options: [option("", "None"), option("front"), option("back")],
      }),
    ],
  },
  {
    id: "alignment-drills",
    title: "Alignment",
    fields: [
      field("boolean", "alignmentDrills.generate", "Generate"),
      field("float", "alignmentDrills.distance.x", "Distance X", {
        min: 0,
        step: 0.1,
      }),
      field("float", "alignmentDrills.distance.y", "Distance Y", {
        min: 0,
        step: 0.1,
      }),
      field("float", "alignmentDrills.diameter", "Diameter", {
        min: 0,
        step: 0.1,
      }),
    ],
  },
  {
    id: "electroplating",
    title: "Electroplate",
    fields: [
      field(
        "boolean",
        "electroplating.generateEdgeCutsWithAlignmentDrills",
        "Edge cuts with alignment drills",
      ),
      field("float", "electroplating.additionalDistance.left", "Left offset"),
      field("float", "electroplating.additionalDistance.right", "Right offset"),
      field("float", "electroplating.additionalDistance.top", "Top offset"),
      field("float", "electroplating.additionalDistance.bottom", "Bottom offset"),
      field("float", "electroplating.cornerRadius", "Corner radius"),
      field("float", "electroplating.container.waterMl", "Bath water ml"),
      field(
        "optionalFloat",
        "electroplating.container.maxBoardWidthMm",
        "Max board width mm",
      ),
      field(
        "optionalFloat",
        "electroplating.container.maxBoardHeightMm",
        "Max board height mm",
      ),
      field("boolean", "electroplating.container.allowRotation", "Allow rotation"),
      field(
        "float",
        "electroplating.recipe.currentDensityMaPerCm2",
        "Current density mA/cm2",
      ),
      field("float", "electroplating.recipe.durationMinutes", "Duration minutes"),
      field("float", "electroplating.recipe.stirRpm", "Stir RPM"),
      field(
        "float",
        "electroplating.recipe.targetCopperMicrons",
        "Target copper microns",
      ),
      field("float", "electroplating.recipe.voltageLimitV", "Voltage limit V"),
      field(
        "float",
        "electroplating.recipe.copperSulfatePentahydrate.gramsPerLiter",
        "Copper sulfate g/L",
      ),
      field("float", "electroplating.recipe.citricAcid.gramsPerLiter", "Citric acid g/L"),
      field(
        "float",
        "electroplating.recipe.polysorbate20.millilitersPerLiter",
        "Polysorbate 20 ml/L",
      ),
      field(
        "float",
        "electroplating.recipe.hcl.solutionConcentrationPercent",
        "HCl solution concentration %",
      ),
      field(
        "float",
        "electroplating.recipe.hcl.referenceConcentrationPercent",
        "HCl reference concentration %",
      ),
      field(
        "float",
        "electroplating.recipe.hcl.referenceMillilitersPerLiter",
        "HCl reference ml/L",
      ),
    ],
  },
  {
    id: "solder-mask",
    title: "Solder Mask",
    fields: [
      field("boolean", "solderMask.generate", "Generate"),
      field("boolean", "solderMask.double", "Double"),
      field("toml", "solderMask.excludeSides", "Exclude sides", {
        description: sideArrayDescription,
      }),
      field("float", "solderMask.distance.x", "Distance X"),
      field("float", "solderMask.distance.y", "Distance Y"),
      field("select", "solderMask.xtool.device", "xTool device", {
        options: [option("M1 Ultra")],
      }),
      field("float", "solderMask.xtool.intensity", "xTool intensity"),
      field("integer", "solderMask.xtool.passes", "xTool passes", {
        min: 1,
        step: 1,
      }),
    ],
  },
  {
    id: "stencil",
    title: "Stencil",
    fields: [
      field("boolean", "stencil.generate", "Generate"),
      field("toml", "stencil.excludeSides", "Exclude sides", {
        description: sideArrayDescription,
      }),
      field("select", "stencil.xtool.device", "xTool device", {
        options: [option("F1 Ultra")],
      }),
      field("float", "stencil.xtool.power", "xTool power"),
      field("float", "stencil.xtool.speed", "xTool speed"),
      field("integer", "stencil.xtool.passes", "xTool passes", {
        min: 1,
        step: 1,
      }),
    ],
  },
  {
    id: "outputs",
    title: "Outputs",
    fields: [
      field("boolean", "drills.generate", "Generate drills"),
      field("boolean", "drills.withEdgeCuts", "Drills with edge cuts"),
      field("boolean", "place.generate", "Generate placement"),
    ],
  },
  {
    id: "cnc",
    title: "CNC",
    fields: [
      field("toml", "cnc.availableDrills", "Available drills", {
        description: "TOML array of drill tool objects.",
      }),
      field("toml", "cnc.availableMills", "Available mills", {
        description: "TOML array of mill tool objects.",
      }),
      field("float", "cnc.isolation.feedRate", "Isolation feed rate"),
      field("float", "cnc.isolation.spindleSpeed", "Isolation spindle speed"),
      field("float", "cnc.isolation.zCutDepth", "Isolation Z cut depth"),
      field("float", "cnc.isolation.zCutFeedRate", "Isolation Z feed rate"),
      field("select", "cnc.isolation.tool.type", "Isolation tool type", {
        options: [option("vbit"), option("mill"), option("drill")],
      }),
      field("float", "cnc.isolation.tool.diameter", "Isolation tool diameter"),
      field("optionalFloat", "cnc.isolation.tool.angle", "Isolation V-bit angle"),
      field("integer", "cnc.isolation.passes", "Isolation passes", {
        min: 1,
        step: 1,
      }),
      field("float", "cnc.isolation.overlap", "Isolation overlap"),
      field("numberSelect", "cnc.isolation.isoType", "Isolation type", {
        options: [option("0", "Exteriors"), option("1", "Interiors"), option("2", "Full")],
      }),
      field("float", "cnc.nonCopperClearing.feedRate", "NCC feed rate"),
      field("float", "cnc.nonCopperClearing.spindleSpeed", "NCC spindle speed"),
      field("float", "cnc.nonCopperClearing.zCutDepth", "NCC Z cut depth"),
      field("float", "cnc.nonCopperClearing.zCutFeedRate", "NCC Z feed rate"),
      field("select", "cnc.nonCopperClearing.tool.type", "NCC tool type", {
        options: [option("vbit"), option("mill"), option("drill")],
      }),
      field("float", "cnc.nonCopperClearing.tool.diameter", "NCC tool diameter"),
      field("optionalFloat", "cnc.nonCopperClearing.tool.angle", "NCC V-bit angle"),
      field("float", "cnc.nonCopperClearing.overlap", "NCC overlap"),
      field("float", "cnc.nonCopperClearing.margin", "NCC margin"),
      field("select", "cnc.nonCopperClearing.method", "NCC method", {
        options: [option("standard"), option("seed"), option("lines")],
      }),
      field("float", "cnc.nonCopperClearing.millZCutDepth", "NCC mill Z cut depth"),
      field("float", "cnc.clearance.travelZ", "Travel Z"),
      field("float", "cnc.clearance.endZ", "End Z"),
      field("float", "cnc.clearance.rapidFeedRate", "Rapid feed rate"),
      field("float", "cnc.clearance.seamZ", "Seam Z"),
      field("select", "cnc.backside.mirrorAxis", "Backside mirror axis", {
        options: [option("X"), option("Y")],
      }),
      field("float", "cnc.drilling.matchToleranceMm", "Drill match tolerance mm"),
    ],
  },
  {
    id: "xtool",
    title: "xTool",
    fields: [
      field("string", "xtool.appPath", "App path"),
      field("string", "xtool.cdpHost", "CDP host"),
      field("integer", "xtool.cdpPort", "CDP port", { min: 1, step: 1 }),
      field("integer", "xtool.window.width", "Window width", { min: 1, step: 1 }),
      field("integer", "xtool.window.height", "Window height", { min: 1, step: 1 }),
      field("select", "xtool.existingProcess", "Existing process", {
        options: [option("prompt")],
      }),
    ],
  },
  {
    id: "makeracam",
    title: "MakeraCAM",
    fields: [
      field("string", "makeracam.appPath", "App path"),
      field("float", "makeracam.cutDepthMm", "Cut depth mm"),
      field("integer", "makeracam.tabsPerContour", "Tabs per contour", {
        min: 0,
        step: 1,
      }),
      field("select", "makeracam.existingProcess", "Existing process", {
        options: [option("prompt")],
      }),
      field("integer", "makeracam.window.width", "Window width", {
        min: 1,
        step: 1,
      }),
      field("integer", "makeracam.window.height", "Window height", {
        min: 1,
        step: 1,
      }),
      field("boolean", "makeracam.platedHoles.generate", "Generate plated holes"),
      field("boolean", "makeracam.finalCut.generate", "Generate final cut"),
    ],
  },
  {
    id: "validation",
    title: "Validation",
    fields: [
      field("float", "validation.ranges.distanceMm.min", "Distance min"),
      field("float", "validation.ranges.distanceMm.max", "Distance max"),
      field("float", "validation.ranges.toolDiameterMm.min", "Tool diameter min"),
      field("float", "validation.ranges.toolDiameterMm.max", "Tool diameter max"),
      field("float", "validation.ranges.feedRate.min", "Feed rate min"),
      field("float", "validation.ranges.feedRate.max", "Feed rate max"),
      field("float", "validation.ranges.spindleSpeed.min", "Spindle speed min"),
      field("float", "validation.ranges.spindleSpeed.max", "Spindle speed max"),
      field("float", "validation.ranges.cutDepthMm.min", "Cut depth min"),
      field("float", "validation.ranges.cutDepthMm.max", "Cut depth max"),
      field("float", "validation.ranges.angleDegrees.min", "Angle min"),
      field("float", "validation.ranges.angleDegrees.max", "Angle max"),
      field("float", "validation.ranges.xtoolPercent.min", "xTool percent min"),
      field("float", "validation.ranges.xtoolPercent.max", "xTool percent max"),
      field("float", "validation.ranges.xtoolPasses.min", "xTool passes min"),
      field("float", "validation.ranges.xtoolPasses.max", "xTool passes max"),
      field("float", "validation.ranges.xtoolSpeed.min", "xTool speed min"),
      field("float", "validation.ranges.xtoolSpeed.max", "xTool speed max"),
      field(
        "float",
        "validation.ranges.electroplatingBoardSizeMm.min",
        "Electroplating board size min",
      ),
      field(
        "float",
        "validation.ranges.electroplatingBoardSizeMm.max",
        "Electroplating board size max",
      ),
      field(
        "float",
        "validation.ranges.electroplatingVolumeMl.min",
        "Electroplating volume min",
      ),
      field(
        "float",
        "validation.ranges.electroplatingVolumeMl.max",
        "Electroplating volume max",
      ),
      field(
        "float",
        "validation.ranges.electroplatingCurrentDensityMaPerCm2.min",
        "Electroplating current density min",
      ),
      field(
        "float",
        "validation.ranges.electroplatingCurrentDensityMaPerCm2.max",
        "Electroplating current density max",
      ),
      field(
        "float",
        "validation.ranges.electroplatingDurationMinutes.min",
        "Electroplating duration min",
      ),
      field(
        "float",
        "validation.ranges.electroplatingDurationMinutes.max",
        "Electroplating duration max",
      ),
      field(
        "float",
        "validation.ranges.electroplatingStirRpm.min",
        "Electroplating stir RPM min",
      ),
      field(
        "float",
        "validation.ranges.electroplatingStirRpm.max",
        "Electroplating stir RPM max",
      ),
      field(
        "float",
        "validation.ranges.electroplatingMicrons.min",
        "Electroplating microns min",
      ),
      field(
        "float",
        "validation.ranges.electroplatingMicrons.max",
        "Electroplating microns max",
      ),
      field(
        "float",
        "validation.ranges.electroplatingVoltageV.min",
        "Electroplating voltage min",
      ),
      field(
        "float",
        "validation.ranges.electroplatingVoltageV.max",
        "Electroplating voltage max",
      ),
      field(
        "float",
        "validation.ranges.electroplatingMassGramsPerLiter.min",
        "Electroplating mass g/L min",
      ),
      field(
        "float",
        "validation.ranges.electroplatingMassGramsPerLiter.max",
        "Electroplating mass g/L max",
      ),
      field(
        "float",
        "validation.ranges.electroplatingLiquidMillilitersPerLiter.min",
        "Electroplating liquid ml/L min",
      ),
      field(
        "float",
        "validation.ranges.electroplatingLiquidMillilitersPerLiter.max",
        "Electroplating liquid ml/L max",
      ),
      field(
        "float",
        "validation.ranges.electroplatingConcentrationPercent.min",
        "Electroplating concentration min",
      ),
      field(
        "float",
        "validation.ranges.electroplatingConcentrationPercent.max",
        "Electroplating concentration max",
      ),
      field(
        "boolean",
        "validation.isolationFeasibility.enabled",
        "Isolation feasibility enabled",
      ),
      field(
        "select",
        "validation.isolationFeasibility.onFailure",
        "Isolation feasibility failure",
        { options: [option("error"), option("warn")] },
      ),
      field("toml", "validation.isolationFeasibility.ignore", "Isolation ignore", {
        description: "TOML array of regex strings.",
      }),
      field(
        "boolean",
        "validation.drillFeasibility.enabled",
        "Drill feasibility enabled",
      ),
      field(
        "select",
        "validation.drillFeasibility.onFailure",
        "Drill feasibility failure",
        { options: [option("error"), option("warn")] },
      ),
    ],
  },
] as const satisfies readonly ConfigEditorSection[];

export const configEditorFields = configEditorSections.flatMap((section) =>
  section.fields.map((field) => ({ ...field, sectionId: section.id })),
);

const configEditorFieldByPath = new Map(
  configEditorFields.map((field) => [pathKey(field.path), field]),
);

export const configEditorLeafPathKeys = (): readonly string[] =>
  configEditorFields.map((field) => pathKey(field.path));

export function discoverConfigLeafPathKeys(
  value?: unknown,
  prefix: readonly string[] = [],
): readonly string[] {
  const actualValue =
    value === undefined && prefix.length === 0 ? defaultConfigFile : value;

  if (Array.isArray(actualValue) || !isRecord(actualValue)) {
    return [pathKey(prefix)];
  }

  return Object.entries(actualValue).flatMap(([key, child]) =>
    discoverConfigLeafPathKeys(child, [...prefix, key]),
  );
}

export const defaultUserConfigPath = () => join(homedir(), userConfigFilename);

const decodeConfigSync = (raw: Record<string, unknown>): ConfigFile =>
  Effect.runSync(decodeConfig(raw));

const loadConfigFileSync = (filePath: string): Record<string, unknown> =>
  Effect.runSync(loadConfigFile(filePath));

const parseTomlText = (
  text: string,
  filePath = "config editor input",
): Record<string, unknown> => {
  const parsed = parse(text) as unknown;

  if (!isRecord(parsed)) {
    throw new Error(`Config file "${filePath}" must contain a TOML table.`);
  }

  return parsed;
};

const parseTomlLiteral = (value: string, label: string): TomlValue | undefined => {
  const trimmed = value.trim();

  if (trimmed === "") {
    return undefined;
  }

  const parsed = parseTomlText(`value = ${trimmed}`, label).value;
  return asTomlValue(parsed, label);
};

const asTomlValue = (value: unknown, label: string): TomlValue => {
  if (
    typeof value === "string" ||
    typeof value === "boolean" ||
    typeof value === "number"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => asTomlValue(entry, label));
  }

  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        entry === undefined ? undefined : asTomlValue(entry, label),
      ]),
    );
  }

  throw new Error(`${label} must be a TOML string, number, boolean, array, or inline table.`);
};

const getPath = (value: unknown, path: readonly string[]): unknown => {
  let current = value;

  for (const part of path) {
    if (!isRecord(current)) {
      return undefined;
    }
    current = current[part];
  }

  return current;
};

const setPath = (
  target: Record<string, unknown>,
  path: readonly string[],
  value: unknown,
) => {
  let current = target;

  for (const part of path.slice(0, -1)) {
    const next = current[part];
    if (!isRecord(next)) {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }

  current[path[path.length - 1]!] = value;
};

const pruneEmptyRecords = (value: unknown): unknown => {
  if (Array.isArray(value) || !isRecord(value)) {
    return value;
  }

  const entries = Object.entries(value)
    .map(([key, entry]) => [key, pruneEmptyRecords(entry)] as const)
    .filter(([, entry]) => entry !== undefined);

  if (entries.length === 0) {
    return undefined;
  }

  return Object.fromEntries(entries);
};

const withoutExtends = (raw: Record<string, unknown>): Record<string, unknown> => {
  const { extends: _extends, ...rest } = raw;
  return rest;
};

const deepEqual = (left: unknown, right: unknown): boolean => {
  if (Object.is(left, right)) {
    return true;
  }

  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right)) {
      return false;
    }
    return (
      left.length === right.length &&
      left.every((entry, index) => deepEqual(entry, right[index]))
    );
  }

  if (isRecord(left) || isRecord(right)) {
    if (!isRecord(left) || !isRecord(right)) {
      return false;
    }
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);
    if (leftKeys.length !== rightKeys.length) {
      return false;
    }
    return leftKeys.every((key) => deepEqual(left[key], right[key]));
  }

  return false;
};

const stringValue = (value: unknown): string =>
  typeof value === "string" ? value : value === undefined || value === null ? "" : String(value);

export const configToFormValues = (
  config: ConfigFile,
): Record<string, string | number | boolean> => {
  const values: Record<string, string | number | boolean> = {};

  for (const field of configEditorFields) {
    const key = pathKey(field.path);
    const value = getPath(config, field.path);

    switch (field.kind) {
      case "boolean":
        values[key] = Boolean(value);
        break;
      case "float":
      case "integer":
        values[key] = typeof value === "number" ? value : 0;
        break;
      case "numberSelect":
        values[key] = stringValue(value);
        break;
      case "optionalFloat":
      case "optionalString":
      case "select":
      case "string":
        values[key] = stringValue(value);
        break;
      case "toml":
        values[key] =
          value === undefined ? "" : renderTomlInlineValue(asTomlValue(value, key));
        break;
    }
  }

  return values;
};

const parseNumber = (value: unknown, label: string): number => {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) {
    throw new Error(`${label} must be a finite number.`);
  }
  return number;
};

const parseInteger = (value: unknown, label: string): number => {
  const number = parseNumber(value, label);
  if (!Number.isInteger(number)) {
    throw new Error(`${label} must be an integer.`);
  }
  return number;
};

const parseFieldValue = (
  field: ConfigEditorField,
  formValue: unknown,
): unknown | undefined => {
  const label = pathKey(field.path);

  switch (field.kind) {
    case "boolean":
      return Boolean(formValue);
    case "float":
      return parseNumber(formValue, label);
    case "integer":
      return parseInteger(formValue, label);
    case "numberSelect": {
      const text = stringValue(formValue).trim();
      if (text === "") {
        return undefined;
      }
      return parseNumber(text, label);
    }
    case "optionalFloat": {
      const text = stringValue(formValue).trim();
      return text === "" ? undefined : parseNumber(text, label);
    }
    case "optionalString": {
      const text = stringValue(formValue);
      return text.trim() === "" ? undefined : text;
    }
    case "select": {
      const text = stringValue(formValue);
      return text === "" ? undefined : text;
    }
    case "string":
      return stringValue(formValue);
    case "toml":
      return parseTomlLiteral(stringValue(formValue), label);
  }
};

const readExtendsFromRaw = (
  filePath: string,
  raw: Record<string, unknown>,
): readonly string[] => readExtends(filePath, raw);

const loadExtendsRaw = (
  filePath: string,
  extendsEntries: readonly string[],
): Record<string, unknown> => {
  let inherited: Record<string, unknown> = {};

  for (const entry of extendsEntries) {
    inherited = deepMerge(inherited, loadConfigFileSync(resolveSibling(filePath, entry)));
  }

  return inherited;
};

const extendsIncludesPath = (
  filePath: string,
  extendsEntries: readonly string[],
  candidatePath: string,
): boolean =>
  extendsEntries.some(
    (entry) => resolveSibling(filePath, entry) === resolve(candidatePath),
  );

const ensureProjectUserExtends = (
  filePath: string,
  extendsEntries: readonly string[],
  userConfigPath: string,
): readonly string[] => {
  const resolvedUserConfigPath = resolve(userConfigPath);
  const extendsEntry =
    resolvedUserConfigPath === defaultUserConfigPath()
      ? userConfigExtendsPath
      : resolvedUserConfigPath;

  return existsSync(resolvedUserConfigPath) &&
    !extendsIncludesPath(filePath, extendsEntries, resolvedUserConfigPath)
    ? [...extendsEntries, extendsEntry]
    : extendsEntries;
};

export const prepareConfigEditorTarget = ({
  cwd = process.cwd(),
  kicadProject,
  configPath,
  user = false,
  userConfigPath = defaultUserConfigPath(),
}: PrepareConfigEditorTargetOptions = {}): ConfigEditorTarget => {
  const resolvedCwd = resolve(cwd);

  if (user) {
    const targetPath = resolveFrom(resolvedCwd, userConfigPath);
    const currentRaw = existsSync(targetPath) ? readToml(targetPath) : {};
    const baselineRaw: Record<string, unknown> = {};

    return {
      mode: "user",
      targetPath,
      configRoot: dirname(targetPath),
      userConfigPath: targetPath,
      baselineRaw,
      currentRaw,
      baselineConfig: decodeConfigSync(baselineRaw),
      currentConfig: decodeConfigSync(currentRaw),
    };
  }

  const projectRoot = resolveFrom(resolvedCwd, kicadProject ?? ".");
  const targetPath = configPath
    ? resolveFrom(projectRoot, configPath)
    : resolve(projectRoot, projectConfigFilename);
  const targetRaw = existsSync(targetPath) ? readToml(targetPath) : {};
  const targetExtends = ensureProjectUserExtends(
    targetPath,
    readExtendsFromRaw(targetPath, targetRaw),
    resolveFrom(resolvedCwd, userConfigPath),
  );
  const baselineRaw = loadExtendsRaw(targetPath, targetExtends);
  const currentRaw = deepMerge(baselineRaw, withoutExtends(targetRaw));

  if (targetExtends.length > 0) {
    currentRaw.extends = [...targetExtends];
  }

  return {
    mode: "project",
    targetPath,
    configRoot: dirname(targetPath),
    userConfigPath: resolveFrom(resolvedCwd, userConfigPath),
    baselineRaw,
    currentRaw,
    baselineConfig: decodeConfigSync(baselineRaw),
    currentConfig: decodeConfigSync(currentRaw),
  };
};

const parseSubmittedExtends = (
  value: unknown,
): readonly string[] | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    throw new Error("extends must be a TOML array of strings.");
  }

  return value;
};

export const buildSparseConfigFromFormValues = (
  target: ConfigEditorTarget,
  formValues: Record<string, unknown>,
): Record<string, unknown> => {
  const sparse: Record<string, unknown> = {};
  let submittedExtends: readonly string[] | undefined;

  for (const field of configEditorFields) {
    const key = pathKey(field.path);
    const parsed = parseFieldValue(field, formValues[key]);

    if (key === "extends") {
      submittedExtends = parseSubmittedExtends(parsed);
      continue;
    }

    if (parsed === undefined) {
      continue;
    }

    const baseline = getPath(target.baselineConfig, field.path);
    if (!deepEqual(parsed, baseline)) {
      setPath(sparse, field.path, parsed);
    }
  }

  let outputExtends = submittedExtends ?? target.currentConfig.extends;

  if (target.mode === "project") {
    const userPath = target.userConfigPath ?? defaultUserConfigPath();
    outputExtends = ensureProjectUserExtends(target.targetPath, outputExtends, userPath);
  }

  if (outputExtends.length > 0) {
    sparse.extends = [...outputExtends];
  }

  return (pruneEmptyRecords(sparse) ?? {}) as Record<string, unknown>;
};

export const renderSparseConfigToml = (
  sparse: Record<string, unknown>,
): string => {
  const topLevel: Array<readonly [string, TomlValue | undefined]> = [];
  const sections = new Map<string, Array<readonly [string, TomlValue | undefined]>>();

  for (const field of configEditorFields) {
    const value = getPath(sparse, field.path);
    if (value === undefined) {
      continue;
    }

    const sectionName = field.path.slice(0, -1).join(".");
    const key = field.path[field.path.length - 1]!;
    const entry = [key, asTomlValue(value, pathKey(field.path))] as const;

    if (sectionName === "") {
      topLevel.push(entry);
      continue;
    }

    if (!sections.has(sectionName)) {
      sections.set(sectionName, []);
    }
    sections.get(sectionName)!.push(entry);
  }

  const renderedParts = [
    renderTomlAssignments(topLevel),
    ...Array.from(sections, ([name, entries]) => renderTomlSection(name, entries)),
  ].filter((part) => part.trim() !== "");

  return renderedParts.length === 0 ? "" : `${renderedParts.join("\n\n")}\n`;
};

export const validateRenderedConfigToml = (
  toml: string,
  targetPath: string,
) => {
  const raw = parseTomlText(toml, targetPath);
  const inherited = loadExtendsRaw(targetPath, readExtendsFromRaw(targetPath, raw));
  const decoded = decodeConfigSync(deepMerge(inherited, raw));
  return normalizeConfig(decoded, dirname(targetPath));
};

export type BuildConfigEditorSaveResult = {
  readonly targetPath: string;
  readonly toml: string;
  readonly sparse: Record<string, unknown>;
};

export const buildConfigEditorSave = (
  target: ConfigEditorTarget,
  formValues: Record<string, unknown>,
): BuildConfigEditorSaveResult => {
  const sparse = buildSparseConfigFromFormValues(target, formValues);
  const toml = renderSparseConfigToml(sparse);
  validateRenderedConfigToml(toml, target.targetPath);

  return {
    targetPath: target.targetPath,
    toml,
    sparse,
  };
};

export const assertConfigEditorDescriptorCoverage = () => {
  const expected = new Set(discoverConfigLeafPathKeys());
  const actual = new Set(configEditorLeafPathKeys());
  const missing = [...expected].filter((key) => !actual.has(key));
  const extra = [...actual].filter((key) => !expected.has(key));

  if (missing.length > 0 || extra.length > 0) {
    throw new Error(
      [
        missing.length > 0 ? `Missing config editor fields: ${missing.join(", ")}` : "",
        extra.length > 0 ? `Extra config editor fields: ${extra.join(", ")}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }
};

export const decodeConfigEditorSparse = (sparse: Record<string, unknown>) =>
  Schema.decodeUnknownSync(ConfigFileSchema, parseOptions)(sparse);

export const sectionForFieldPath = (fieldPath: string): string | undefined =>
  configEditorFieldByPath.get(fieldPath)?.sectionId;
