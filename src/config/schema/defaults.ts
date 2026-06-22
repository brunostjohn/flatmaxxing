import type {
  CncClearanceOptions,
  CncDrillingOptions,
  CncDrillOptions,
  CncIsolationOptions,
  CncMillBitOptions,
  CncNonCopperClearingOptions,
  Range,
  Side,
} from "../types";

export const defaultKicadCli =
  "/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli";

// The CNC stage shells out to FlatCAM headlessly (`flatcam --shellfile=… --headless=1`).
export const defaultFlatcam = "flatcam";

export const defaultDependencies = {
  kicadCli: defaultKicadCli,
  flatcam: defaultFlatcam,
  docker: undefined,
};

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
  // Diameter of the registration dowel holes (CarveraPCBGuide uses 2mm).
  diameter: 2,
};

export const defaultElectroplating = {
  generateEdgeCutsWithAlignmentDrills: true,
  additionalDistance: defaultElectroplatingAdditionalDistance,
  cornerRadius: 2,
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
  // This currently only annotates downstream handling; KiCad drill generation
  // is unchanged by the flag.
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

// Trace isolation with the V-bit. Feeds follow the CarveraPCBGuide values
// (XY 120 / Z 60). zCutDepth (0.05) drives the effective V-bit width:
// effective_dia = tip + 2*|cutZ|*tan(angle/2) = 0.14 + 2*0.05*tan(30deg) ≈ 0.198.
export const defaultCncIsolation = {
  feedRate: 120,
  spindleSpeed: 15000,
  zCutDepth: 0.05,
  zCutFeedRate: 60,
  tool: defaultCncVBitTool,
  passes: 3,
  overlap: 60,
  // 0 = exteriors, 1 = interiors, 2 = full isolation (both).
  isoType: 2,
} satisfies CncIsolationOptions;

// Non-copper clearing. The tool list is derived at build time from
// cnc.availableMills (biggest→smallest) plus the isolation V-bit appended last,
// run as a non-rest multi-tool job (FlatCAM's non-rest path already clears
// complementary "rest" areas). Mills cut deeper (millZCutDepth) than the V-bit
// (zCutDepth) because corn-bit TLO probing is unreliable.
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

// Machine clearance/travel heights shared by isolation + NCC. Values from the
// user's last real Carvera run. seamZ is the retract between merged operations.
export const defaultCncClearance = {
  travelZ: 2,
  endZ: 15,
  rapidFeedRate: 1500,
  seamZ: 15,
} satisfies CncClearanceOptions;

// Back side is machined after flipping the board left-right on the alignment
// dowels, so the back copper is mirrored across the X axis.
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

// Hole→tool matching: a drill bit may be at most matchToleranceMm wider than a
// hole and still be used (rounding up — never undersize). On tiny boards even
// +0.05mm matters, so every round-up is warned and logged to ROUNDED_UP.txt.
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
};

// Pre-flight gate: verify the chosen V-bit can isolate every trace (via a KiCad
// DRC run with the effective tool diameter as the clearance constraint) before
// generating any G-code. "error" aborts the run; "warn" only logs.
// `ignore` is a list of regexes matched against each clearance violation's text
// (description + the items involved); matching violations are excluded from the
// gate. Use it for intentional offenders like awkward antenna footprints.
export const defaultIsolationFeasibility = {
  enabled: true,
  onFailure: "error" as const,
  ignore: [] as string[],
};

// Pre-flight gate: verify every component hole can be made with the tools on
// hand (an exact/round-up drill, else a cornmill that fits as a pocket) before
// generating any G-code. "error" aborts the run; "warn" only logs. No ignore
// list — unlike isolation, an unmachinable hole is never intentional.
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
