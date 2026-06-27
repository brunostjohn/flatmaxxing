import { defaultConfigFile, isRecord } from "@/config";
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

export const configEditorSections = [
  {
    id: "project",
    title: "Project",
    fields: [
      field("toml", "extends", "Extends", {
        description: `TOML string array of parent config files.`,
      }),
      field("string", "projectDir", "Project directory"),
      field("boolean", "skipRenderBoard", "Skip board preview"),
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
      field(
        "float",
        "electroplating.additionalDistance.bottom",
        "Bottom offset",
      ),
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
      field(
        "boolean",
        "electroplating.container.allowRotation",
        "Allow rotation",
      ),
      field(
        "float",
        "electroplating.recipe.currentDensityMaPerCm2",
        "Current density mA/cm2",
      ),
      field(
        "float",
        "electroplating.recipe.durationMinutes",
        "Duration minutes",
      ),
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
      field(
        "float",
        "electroplating.recipe.citricAcid.gramsPerLiter",
        "Citric acid g/L",
      ),
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
      field(
        "optionalFloat",
        "cnc.isolation.tool.angle",
        "Isolation V-bit angle",
      ),
      field("integer", "cnc.isolation.passes", "Isolation passes", {
        min: 1,
        step: 1,
      }),
      field("float", "cnc.isolation.overlap", "Isolation overlap"),
      field("numberSelect", "cnc.isolation.isoType", "Isolation type", {
        options: [
          option("0", "Exteriors"),
          option("1", "Interiors"),
          option("2", "Full"),
        ],
      }),
      field("float", "cnc.nonCopperClearing.feedRate", "NCC feed rate"),
      field("float", "cnc.nonCopperClearing.spindleSpeed", "NCC spindle speed"),
      field("float", "cnc.nonCopperClearing.zCutDepth", "NCC Z cut depth"),
      field("float", "cnc.nonCopperClearing.zCutFeedRate", "NCC Z feed rate"),
      field("select", "cnc.nonCopperClearing.tool.type", "NCC tool type", {
        options: [option("vbit"), option("mill"), option("drill")],
      }),
      field(
        "float",
        "cnc.nonCopperClearing.tool.diameter",
        "NCC tool diameter",
      ),
      field(
        "optionalFloat",
        "cnc.nonCopperClearing.tool.angle",
        "NCC V-bit angle",
      ),
      field("float", "cnc.nonCopperClearing.overlap", "NCC overlap"),
      field("float", "cnc.nonCopperClearing.margin", "NCC margin"),
      field("select", "cnc.nonCopperClearing.method", "NCC method", {
        options: [option("standard"), option("seed"), option("lines")],
      }),
      field(
        "float",
        "cnc.nonCopperClearing.millZCutDepth",
        "NCC mill Z cut depth",
      ),
      field("float", "cnc.clearance.travelZ", "Travel Z"),
      field("float", "cnc.clearance.endZ", "End Z"),
      field("float", "cnc.clearance.rapidFeedRate", "Rapid feed rate"),
      field("float", "cnc.clearance.seamZ", "Seam Z"),
      field("select", "cnc.backside.mirrorAxis", "Backside mirror axis", {
        options: [option("X"), option("Y")],
      }),
      field(
        "float",
        "cnc.drilling.matchToleranceMm",
        "Drill match tolerance mm",
      ),
    ],
  },
  {
    id: "xtool",
    title: "xTool",
    fields: [
      field("string", "xtool.appPath", "App path"),
      field("string", "xtool.cdpHost", "CDP host"),
      field("integer", "xtool.cdpPort", "CDP port", { min: 1, step: 1 }),
      field("integer", "xtool.window.width", "Window width", {
        min: 1,
        step: 1,
      }),
      field("integer", "xtool.window.height", "Window height", {
        min: 1,
        step: 1,
      }),
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
      field(
        "boolean",
        "makeracam.platedHoles.generate",
        "Generate plated holes",
      ),
      field("boolean", "makeracam.finalCut.generate", "Generate final cut"),
    ],
  },
  {
    id: "validation",
    title: "Validation",
    fields: [
      field("float", "validation.ranges.distanceMm.min", "Distance min"),
      field("float", "validation.ranges.distanceMm.max", "Distance max"),
      field(
        "float",
        "validation.ranges.toolDiameterMm.min",
        "Tool diameter min",
      ),
      field(
        "float",
        "validation.ranges.toolDiameterMm.max",
        "Tool diameter max",
      ),
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
      field(
        "toml",
        "validation.isolationFeasibility.ignore",
        "Isolation ignore",
        {
          description: "TOML array of regex strings.",
        },
      ),
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

  if (missing.length > 0 || extra.length > 0) {
    throw new ConfigError({
      message: [
        missing.length > 0
          ? `Missing config editor fields: ${missing.join(", ")}`
          : "",
        extra.length > 0
          ? `Extra config editor fields: ${extra.join(", ")}`
          : "",
      ]
        .filter(Boolean)
        .join("\n"),
    });
  }
};
