import type {
  CncClearanceOptions,
  CncDrillingOptions,
  CncDrillOptions,
  ElectroplatingContainerOptions,
  ElectroplatingRecipeOptions,
  CncIsolationOptions,
  CncMillBitOptions,
  CncNonCopperClearingOptions,
  Range,
  Side,
} from "../types";

export const defaultKicadCli =
  "/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli";

export const defaultFlatcam = "flatcam";

export const defaultDependencies = {
  kicadCli: defaultKicadCli,
  flatcam: defaultFlatcam,
};

export const defaultProjectDir = ".";
export const defaultSkipRenderBoard = false;

export const defaultPaths = {
  additionalProjects: "./manufacture",
  gcode: "./gcodes",
  svg: "./svg",
  dxf: "./dxf",
  png: "./png",
  gerbers: "./gerbers",
  drills: "./drills",
  xtool: "./xtool",
  place: "./place",
  cnc: "./cnc",
};

export const defaultBoard = {
  autoFix: false,
  file: undefined,
  ignoreSide: null,
} satisfies {
  autoFix: boolean;
  file?: string | undefined;
  ignoreSide: Side | null;
};

export const defaultDistance = { x: 0, y: 0 };
export const defaultAlignmentDrillDistance = { x: 6, y: 6 };
export const defaultSolderMaskDistance = { x: 6, y: 6 };

export const defaultElectroplatingAdditionalDistance = {
  left: 16,
  right: 4,
  top: 4,
  bottom: 4,
};

export const defaultElectroplatingContainer = {
  waterMl: 300,
  maxBoardWidthMm: undefined,
  maxBoardHeightMm: undefined,
  allowRotation: true,
} satisfies ElectroplatingContainerOptions;

export const defaultElectroplatingRecipe = {
  currentDensityMaPerCm2: 21.5,
  durationMinutes: 40,
  stirRpm: 400,
  targetCopperMicrons: 20,
  voltageLimitV: 5,
  copperSulfatePentahydrate: {
    gramsPerLiter: 250,
  },
  citricAcid: {
    gramsPerLiter: 190,
  },
  polysorbate20: {
    millilitersPerLiter: 10,
  },
  hcl: {
    solutionConcentrationPercent: 7.5,
    referenceConcentrationPercent: 7.5,
    referenceMillilitersPerLiter: 1,
  },
} satisfies ElectroplatingRecipeOptions;

export const defaultXToolWindow = {
  width: 1280,
  height: 720,
};

export const defaultXTool = {
  appPath: "/Applications/xTool Studio.app",
  cdpHost: "127.0.0.1",
  cdpPort: 9333,
  window: defaultXToolWindow,
  existingProcess: "prompt" as const,
};

export const defaultMakeracamWindow = {
  width: 1728,
  height: 1037,
};

export const defaultMakeracam = {
  appPath: "/Applications/MakeraCAM.app",
  cutDepthMm: 2,
  tabsPerContour: 4,
  existingProcess: "prompt" as const,
  window: defaultMakeracamWindow,
  platedHoles: { generate: true },
  finalCut: { generate: true },
};

export const defaultSolderMaskXTool = {
  device: "M1 Ultra" as const,
  intensity: 100,
  passes: 3,
};

export const defaultStencilXTool = {
  device: "F1 Ultra" as const,
  power: 100,
  speed: 6000,
  passes: 3,
};

export const defaultAlignmentDrills = {
  generate: true,
  distance: defaultAlignmentDrillDistance,
  diameter: 2,
};

export const defaultElectroplating = {
  generateEdgeCutsWithAlignmentDrills: true,
  additionalDistance: defaultElectroplatingAdditionalDistance,
  cornerRadius: 2,
  container: defaultElectroplatingContainer,
  recipe: defaultElectroplatingRecipe,
};

export const defaultSolderMask = {
  generate: true,
  double: true,
  excludeSides: [] as Side[],
  distance: defaultSolderMaskDistance,
  xtool: defaultSolderMaskXTool,
};

export const defaultStencil = {
  generate: true,
  excludeSides: [] as Side[],
  xtool: defaultStencilXTool,
};

export const defaultDrills = {
  generate: true,
  withEdgeCuts: false,
};

export const defaultPlace = {
  generate: true,
};

export const defaultCncVBitTool = {
  type: "vbit" as const,
  diameter: 0.14,
  angle: 60,
};

export const defaultCncMillTool = {
  type: "mill" as const,
  diameter: 1,
};

export const defaultCncDrillTool = {
  type: "drill" as const,
  diameter: 1,
};

export const defaultCncIsolation = {
  feedRate: 120,
  spindleSpeed: 15000,
  zCutDepth: 0.05,
  zCutFeedRate: 60,
  tool: defaultCncVBitTool,
  passes: 3,
  overlap: 60,
  isoType: 2,
} satisfies CncIsolationOptions;

export const defaultCncNonCopperClearing = {
  feedRate: 120,
  spindleSpeed: 15000,
  zCutDepth: 0.05,
  zCutFeedRate: 60,
  tool: defaultCncVBitTool,
  overlap: 40,
  margin: 0,
  method: "seed" as const,
  millZCutDepth: 0.075,
} satisfies CncNonCopperClearingOptions;

export const defaultCncClearance = {
  travelZ: 2,
  endZ: 15,
  rapidFeedRate: 1500,
  seamZ: 15,
} satisfies CncClearanceOptions;

export const defaultCncBackside = {
  mirrorAxis: "X" as const,
};

export const defaultAvailableDrills = [
  { type: "drill", diameter: 0.3 },
  { type: "drill", diameter: 0.5 },
  { type: "drill", diameter: 0.7 },
  { type: "drill", diameter: 0.8 },
  { type: "drill", diameter: 1.0 },
  { type: "drill", diameter: 1.1 },
  { type: "drill", diameter: 1.2 },
] satisfies CncDrillOptions[];

export const defaultAvailableMills = [
  { type: "mill", diameter: 0.7 },
  { type: "mill", diameter: 0.8 },
  { type: "mill", diameter: 1.0 },
  { type: "mill", diameter: 1.1 },
  { type: "mill", diameter: 1.2 },
  { type: "mill", diameter: 1.3 },
  { type: "mill", diameter: 1.4 },
  { type: "mill", diameter: 1.5 },
] satisfies CncMillBitOptions[];

export const defaultCncDrilling = {
  matchToleranceMm: 0.05,
} satisfies CncDrillingOptions;

export const defaultCnc = {
  isolation: defaultCncIsolation,
  nonCopperClearing: defaultCncNonCopperClearing,
  clearance: defaultCncClearance,
  backside: defaultCncBackside,
  drilling: defaultCncDrilling,
  availableDrills: defaultAvailableDrills,
  availableMills: defaultAvailableMills,
};

export const defaultRange = {
  min: 0,
  max: Number.MAX_SAFE_INTEGER,
} satisfies Range;

export const defaultValidationRanges = {
  distanceMm: { min: 0, max: 250 },
  toolDiameterMm: { min: 0.01, max: 10 },
  feedRate: { min: 1, max: 10000 },
  spindleSpeed: { min: 1, max: 50000 },
  cutDepthMm: { min: 0.001, max: 5 },
  angleDegrees: { min: 1, max: 180 },
  xtoolPercent: { min: 0, max: 100 },
  xtoolPasses: { min: 1, max: 20 },
  xtoolSpeed: { min: 1, max: 20000 },
  electroplatingBoardSizeMm: { min: 0.001, max: 1000 },
  electroplatingVolumeMl: { min: 1, max: 10000 },
  electroplatingCurrentDensityMaPerCm2: { min: 0.001, max: 1000 },
  electroplatingDurationMinutes: { min: 1, max: 10000 },
  electroplatingStirRpm: { min: 0, max: 10000 },
  electroplatingMicrons: { min: 0, max: 1000 },
  electroplatingVoltageV: { min: 0.001, max: 100 },
  electroplatingMassGramsPerLiter: { min: 0, max: 5000 },
  electroplatingLiquidMillilitersPerLiter: { min: 0, max: 1000 },
  electroplatingConcentrationPercent: { min: 0.001, max: 100 },
};

export const defaultIsolationFeasibility = {
  enabled: true,
  onFailure: "error" as const,
  ignore: [] as string[],
};

export const defaultDrillFeasibility = {
  enabled: true,
  onFailure: "error" as const,
};

export const defaultValidation = {
  ranges: defaultValidationRanges,
  isolationFeasibility: defaultIsolationFeasibility,
  drillFeasibility: defaultDrillFeasibility,
};

export const defaultConfigFile = {
  extends: [] as string[],
  projectDir: defaultProjectDir,
  skipRenderBoard: defaultSkipRenderBoard,
  dependencies: defaultDependencies,
  paths: defaultPaths,
  board: defaultBoard,
  alignmentDrills: defaultAlignmentDrills,
  electroplating: defaultElectroplating,
  solderMask: defaultSolderMask,
  stencil: defaultStencil,
  drills: defaultDrills,
  place: defaultPlace,
  cnc: defaultCnc,
  xtool: defaultXTool,
  makeracam: defaultMakeracam,
  validation: defaultValidation,
};
