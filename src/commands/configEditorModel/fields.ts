import { defaultConfigFile, isRecord, schemaAnnotationForPath } from "@/config";
import { ConfigError } from "@/errors";
import { Array } from "effect";
import type {
  ConfigEditorField,
  ConfigEditorFieldKind,
  ConfigEditorSection,
  ConfigEditorSelectOption,
} from "../types";
import { sideArrayDescription } from "./constants";

export const pathKey = (path: readonly string[]) => path.join(".");

type RawFieldOptions = Omit<ConfigEditorField, "kind" | "path" | "label">;

interface RawField {
  readonly kind: ConfigEditorFieldKind;
  readonly path: readonly string[];
  readonly options: RawFieldOptions;
}

interface RawSection {
  readonly id: string;
  readonly title: string;
  readonly fields: readonly RawField[];
}

const field = (
  kind: ConfigEditorFieldKind,
  path: string,
  options: RawFieldOptions = {},
): RawField => ({ kind, path: path.split("."), options });

const option = (value: string, label = value): ConfigEditorSelectOption => ({
  label,
  value,
});

const rawSections: readonly RawSection[] = [
  {
    id: "project",
    title: "Project",
    fields: [
      field("toml", "extends", {
        description: "TOML string array of parent config files.",
      }),
      field("string", "projectDir"),
      field("boolean", "skipRenderBoard"),
    ],
  },
  {
    id: "skills",
    title: "Skills",
    fields: [field("boolean", "skills.autoInstall")],
  },
  {
    id: "dependencies",
    title: "Dependencies",
    fields: [
      field("string", "dependencies.kicadCli"),
      field("string", "dependencies.flatcam"),
    ],
  },
  {
    id: "paths",
    title: "Output paths",
    fields: [
      field("string", "paths.additionalProjects"),
      field("string", "paths.gcode"),
      field("string", "paths.svg"),
      field("string", "paths.dxf"),
      field("string", "paths.png"),
      field("string", "paths.gerbers"),
      field("string", "paths.drills"),
      field("string", "paths.xtool"),
      field("string", "paths.place"),
      field("string", "paths.cnc"),
    ],
  },
  {
    id: "board",
    title: "Board",
    fields: [
      field("boolean", "board.autoFix"),
      field("optionalString", "board.file"),
      field("select", "board.ignoreSide", {
        options: [option("", "None"), option("front"), option("back")],
      }),
    ],
  },
  {
    id: "alignment-drills",
    title: "Alignment drills",
    fields: [
      field("boolean", "alignmentDrills.generate"),
      field("float", "alignmentDrills.distance.x", { min: 0, step: 0.1 }),
      field("float", "alignmentDrills.distance.y", { min: 0, step: 0.1 }),
      field("float", "alignmentDrills.diameter", { min: 0, step: 0.1 }),
    ],
  },
  {
    id: "electroplating",
    title: "Electroplating",
    fields: [
      field("boolean", "electroplating.generateEdgeCutsWithAlignmentDrills"),
      field("float", "electroplating.additionalDistance.left"),
      field("float", "electroplating.additionalDistance.right"),
      field("float", "electroplating.additionalDistance.top"),
      field("float", "electroplating.additionalDistance.bottom"),
      field("float", "electroplating.cornerRadius"),
      field("float", "electroplating.container.waterMl"),
      field("optionalFloat", "electroplating.container.maxBoardWidthMm"),
      field("optionalFloat", "electroplating.container.maxBoardHeightMm"),
      field("boolean", "electroplating.container.allowRotation"),
      field("float", "electroplating.recipe.currentDensityMaPerCm2"),
      field("float", "electroplating.recipe.durationMinutes"),
      field("float", "electroplating.recipe.stirRpm"),
      field("float", "electroplating.recipe.targetCopperMicrons"),
      field("float", "electroplating.recipe.voltageLimitV"),
      field(
        "float",
        "electroplating.recipe.copperSulfatePentahydrate.gramsPerLiter",
      ),
      field("float", "electroplating.recipe.citricAcid.gramsPerLiter"),
      field("float", "electroplating.recipe.polysorbate20.millilitersPerLiter"),
      field("float", "electroplating.recipe.hcl.solutionConcentrationPercent"),
      field("float", "electroplating.recipe.hcl.referenceConcentrationPercent"),
      field("float", "electroplating.recipe.hcl.referenceMillilitersPerLiter"),
    ],
  },
  {
    id: "solder-mask",
    title: "Solder mask",
    fields: [
      field("boolean", "solderMask.generate"),
      field("boolean", "solderMask.double"),
      field("toml", "solderMask.excludeSides", {
        description: sideArrayDescription,
      }),
      field("float", "solderMask.distance.x"),
      field("float", "solderMask.distance.y"),
      field("select", "solderMask.xtool.device", {
        options: [option("M1 Ultra")],
      }),
      field("float", "solderMask.xtool.intensity"),
      field("integer", "solderMask.xtool.passes", { min: 1, step: 1 }),
    ],
  },
  {
    id: "stencil",
    title: "Stencil",
    fields: [
      field("boolean", "stencil.generate"),
      field("toml", "stencil.excludeSides", {
        description: sideArrayDescription,
      }),
      field("select", "stencil.xtool.device", {
        options: [option("F1 Ultra")],
      }),
      field("float", "stencil.xtool.power"),
      field("float", "stencil.xtool.speed"),
      field("integer", "stencil.xtool.passes", { min: 1, step: 1 }),
    ],
  },
  {
    id: "outputs",
    title: "Outputs",
    fields: [
      field("boolean", "drills.generate"),
      field("boolean", "drills.withEdgeCuts"),
      field("boolean", "place.generate"),
    ],
  },
  {
    id: "cnc",
    title: "CNC",
    fields: [
      field("toml", "cnc.availableDrills", {
        description: "TOML array of drill tool objects.",
      }),
      field("toml", "cnc.availableMills", {
        description: "TOML array of mill tool objects.",
      }),
      field("float", "cnc.isolation.feedRate"),
      field("float", "cnc.isolation.spindleSpeed"),
      field("float", "cnc.isolation.zCutDepth"),
      field("float", "cnc.isolation.zCutFeedRate"),
      field("select", "cnc.isolation.tool.type", {
        options: [option("vbit"), option("mill"), option("drill")],
      }),
      field("float", "cnc.isolation.tool.diameter"),
      field("optionalFloat", "cnc.isolation.tool.angle"),
      field("integer", "cnc.isolation.passes", { min: 1, step: 1 }),
      field("float", "cnc.isolation.overlap"),
      field("numberSelect", "cnc.isolation.isoType", {
        options: [
          option("0", "Exteriors"),
          option("1", "Interiors"),
          option("2", "Full"),
        ],
      }),
      field("float", "cnc.nonCopperClearing.feedRate"),
      field("float", "cnc.nonCopperClearing.spindleSpeed"),
      field("float", "cnc.nonCopperClearing.zCutDepth"),
      field("float", "cnc.nonCopperClearing.zCutFeedRate"),
      field("select", "cnc.nonCopperClearing.tool.type", {
        options: [option("vbit"), option("mill"), option("drill")],
      }),
      field("float", "cnc.nonCopperClearing.tool.diameter"),
      field("optionalFloat", "cnc.nonCopperClearing.tool.angle"),
      field("float", "cnc.nonCopperClearing.overlap"),
      field("float", "cnc.nonCopperClearing.margin"),
      field("select", "cnc.nonCopperClearing.method", {
        options: [option("standard"), option("seed"), option("lines")],
      }),
      field("float", "cnc.nonCopperClearing.millZCutDepth"),
      field("float", "cnc.clearance.travelZ"),
      field("float", "cnc.clearance.endZ"),
      field("float", "cnc.clearance.rapidFeedRate"),
      field("float", "cnc.clearance.seamZ"),
      field("select", "cnc.backside.mirrorAxis", {
        options: [option("X"), option("Y")],
      }),
      field("float", "cnc.drilling.matchToleranceMm"),
    ],
  },
  {
    id: "xtool",
    title: "xTool",
    fields: [
      field("string", "xtool.appPath"),
      field("string", "xtool.cdpHost"),
      field("integer", "xtool.cdpPort", { min: 1, step: 1 }),
      field("integer", "xtool.window.width", { min: 1, step: 1 }),
      field("integer", "xtool.window.height", { min: 1, step: 1 }),
      field("select", "xtool.existingProcess", {
        options: [option("prompt")],
      }),
    ],
  },
  {
    id: "makeracam",
    title: "MakeraCAM",
    fields: [
      field("string", "makeracam.appPath"),
      field("float", "makeracam.cutDepthMm"),
      field("integer", "makeracam.tabsPerContour", { min: 0, step: 1 }),
      field("select", "makeracam.existingProcess", {
        options: [option("prompt")],
      }),
      field("integer", "makeracam.window.width", { min: 1, step: 1 }),
      field("integer", "makeracam.window.height", { min: 1, step: 1 }),
      field("boolean", "makeracam.platedHoles.generate"),
      field("boolean", "makeracam.finalCut.generate"),
    ],
  },
  {
    id: "validation",
    title: "Validation",
    fields: [
      field("float", "validation.ranges.distanceMm.min"),
      field("float", "validation.ranges.distanceMm.max"),
      field("float", "validation.ranges.toolDiameterMm.min"),
      field("float", "validation.ranges.toolDiameterMm.max"),
      field("float", "validation.ranges.feedRate.min"),
      field("float", "validation.ranges.feedRate.max"),
      field("float", "validation.ranges.spindleSpeed.min"),
      field("float", "validation.ranges.spindleSpeed.max"),
      field("float", "validation.ranges.cutDepthMm.min"),
      field("float", "validation.ranges.cutDepthMm.max"),
      field("float", "validation.ranges.angleDegrees.min"),
      field("float", "validation.ranges.angleDegrees.max"),
      field("float", "validation.ranges.xtoolPercent.min"),
      field("float", "validation.ranges.xtoolPercent.max"),
      field("float", "validation.ranges.xtoolPasses.min"),
      field("float", "validation.ranges.xtoolPasses.max"),
      field("float", "validation.ranges.xtoolSpeed.min"),
      field("float", "validation.ranges.xtoolSpeed.max"),
      field("float", "validation.ranges.electroplatingBoardSizeMm.min"),
      field("float", "validation.ranges.electroplatingBoardSizeMm.max"),
      field("float", "validation.ranges.electroplatingVolumeMl.min"),
      field("float", "validation.ranges.electroplatingVolumeMl.max"),
      field(
        "float",
        "validation.ranges.electroplatingCurrentDensityMaPerCm2.min",
      ),
      field(
        "float",
        "validation.ranges.electroplatingCurrentDensityMaPerCm2.max",
      ),
      field("float", "validation.ranges.electroplatingDurationMinutes.min"),
      field("float", "validation.ranges.electroplatingDurationMinutes.max"),
      field("float", "validation.ranges.electroplatingStirRpm.min"),
      field("float", "validation.ranges.electroplatingStirRpm.max"),
      field("float", "validation.ranges.electroplatingMicrons.min"),
      field("float", "validation.ranges.electroplatingMicrons.max"),
      field("float", "validation.ranges.electroplatingVoltageV.min"),
      field("float", "validation.ranges.electroplatingVoltageV.max"),
      field("float", "validation.ranges.electroplatingMassGramsPerLiter.min"),
      field("float", "validation.ranges.electroplatingMassGramsPerLiter.max"),
      field(
        "float",
        "validation.ranges.electroplatingLiquidMillilitersPerLiter.min",
      ),
      field(
        "float",
        "validation.ranges.electroplatingLiquidMillilitersPerLiter.max",
      ),
      field(
        "float",
        "validation.ranges.electroplatingConcentrationPercent.min",
      ),
      field(
        "float",
        "validation.ranges.electroplatingConcentrationPercent.max",
      ),
      field("boolean", "validation.isolationFeasibility.enabled"),
      field("select", "validation.isolationFeasibility.onFailure", {
        options: [option("error"), option("warn")],
      }),
      field("toml", "validation.isolationFeasibility.ignore", {
        description: "TOML array of regex strings.",
      }),
      field("boolean", "validation.drillFeasibility.enabled"),
      field("select", "validation.drillFeasibility.onFailure", {
        options: [option("error"), option("warn")],
      }),
    ],
  },
];

const titleChain = (path: readonly string[]): readonly string[] =>
  path.map(
    (_, index) =>
      schemaAnnotationForPath(path.slice(0, index + 1))?.title ??
      path[index] ??
      "",
  );

const labelForPath = (
  path: readonly string[],
  sectionTitle: string,
): string => {
  const titles = titleChain(path);
  const trimmed = titles[0] === sectionTitle ? titles.slice(1) : titles;
  return (trimmed.length > 0 ? trimmed : titles).join(" ");
};

const buildField = (raw: RawField, sectionTitle: string): ConfigEditorField => {
  const { description, ...rest } = raw.options;
  return {
    kind: raw.kind,
    path: raw.path,
    label: labelForPath(raw.path, sectionTitle),
    description: description ?? schemaAnnotationForPath(raw.path)?.description,
    ...rest,
  };
};

export const configEditorSections: readonly ConfigEditorSection[] =
  rawSections.map((section) => ({
    id: section.id,
    title: section.title,
    fields: section.fields.map((raw) => buildField(raw, section.title)),
  }));

export const configEditorFields = configEditorSections.flatMap((section) =>
  section.fields.map((field) => ({ ...field, sectionId: section.id })),
);

const configEditorFieldByPath = new Map(
  configEditorFields.map((field) => [pathKey(field.path), field]),
);

export const configEditorLeafPathKeys = (): readonly string[] =>
  configEditorFields.map((field) => pathKey(field.path));

export const discoverConfigLeafPathKeys = (
  value?: unknown,
  prefix: readonly string[] = [],
): readonly string[] => {
  const actualValue =
    value === undefined && prefix.length === 0 ? defaultConfigFile : value;

  if (Array.isArray(actualValue) || !isRecord(actualValue)) {
    return [pathKey(prefix)];
  }

  return Object.entries(actualValue).flatMap(([key, child]) =>
    discoverConfigLeafPathKeys(child, [...prefix, key]),
  );
};

export const sectionForFieldPath = (fieldPath: string): string | undefined =>
  configEditorFieldByPath.get(fieldPath)?.sectionId;

export const assertConfigEditorDescriptorCoverage = () => {
  const expected = new Set(discoverConfigLeafPathKeys());
  const actual = new Set(configEditorLeafPathKeys());
  const missing = Array.fromIterable(expected).filter(
    (key) => !actual.has(key),
  );
  const extra = Array.fromIterable(actual).filter((key) => !expected.has(key));
  const untitled = Array.fromIterable(actual).filter(
    (key) => schemaAnnotationForPath(key.split("."))?.title === undefined,
  );

  if (missing.length > 0 || extra.length > 0 || untitled.length > 0) {
    throw new ConfigError({
      message: [
        missing.length > 0
          ? `Missing config editor fields: ${missing.join(", ")}`
          : "",
        extra.length > 0
          ? `Extra config editor fields: ${extra.join(", ")}`
          : "",
        untitled.length > 0
          ? `Config editor fields without a schema title: ${untitled.join(", ")}`
          : "",
      ]
        .filter(Boolean)
        .join("\n"),
    });
  }
};
