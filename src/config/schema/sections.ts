import { Effect, Schema } from "effect";
import {
  defaultAlignmentDrillDistance,
  defaultAlignmentDrills,
  defaultAvailableDrills,
  defaultAvailableMills,
  defaultBoard,
  defaultCncBackside,
  defaultCncClearance,
  defaultCncDrilling,
  defaultCncDrillTool,
  defaultCncIsolation,
  defaultCncMillTool,
  defaultCncNonCopperClearing,
  defaultCncVBitTool,
  defaultDependencies,
  defaultDrillFeasibility,
  defaultDrills,
  defaultElectroplating,
  defaultElectroplatingAdditionalDistance,
  defaultElectroplatingContainer,
  defaultElectroplatingRecipe,
  defaultIsolationFeasibility,
  defaultPaths,
  defaultPlace,
  defaultSkills,
  defaultSolderMask,
  defaultSolderMaskDistance,
  defaultSolderMaskXTool,
  defaultStencil,
  defaultStencilXTool,
  defaultValidation,
  defaultValidationRanges,
  defaultMakeracam,
  defaultMakeracamWindow,
  defaultXTool,
  defaultXToolWindow,
} from "./defaults";
import {
  DistanceSchema,
  EdgeDistanceSchema,
  RangeSchema,
  SideSchema,
  WindowSchema,
} from "./primitives";

export const SkillsSchema = Schema.Struct({
  autoInstall: Schema.Boolean.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultSkills.autoInstall)),
  ).annotate({
    title: "Auto-install flatmaxxing skill",
    description:
      "Install the flatmaxxing agent skill on `flatmaxx init` and offer it on `flatmaxx doctor`.",
  }),
}).annotate({
  title: "Skills",
  description: "Agent skill installation settings.",
});

export const DependenciesSchema = Schema.Struct({
  kicadCli: Schema.String.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultDependencies.kicadCli)),
  ).annotate({
    title: "KiCad CLI",
    description: "Path to the kicad-cli executable.",
  }),
  flatcam: Schema.String.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultDependencies.flatcam)),
  ).annotate({
    title: "FlatCAM",
    description: "FlatCAM command or executable path.",
  }),
}).annotate({
  title: "Dependencies",
  description: "External tool locations.",
});

export const PathsSchema = Schema.Struct({
  additionalProjects: Schema.String.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultPaths.additionalProjects)),
  ).annotate({
    title: "Additional projects",
    description: "Directory for additional manufacture projects.",
  }),
  gcode: Schema.String.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultPaths.gcode)),
  ).annotate({
    title: "G-code",
    description: "Directory for generated G-code.",
  }),
  svg: Schema.String.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultPaths.svg)),
  ).annotate({
    title: "SVG",
    description: "Directory for generated SVG files.",
  }),
  dxf: Schema.String.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultPaths.dxf)),
  ).annotate({
    title: "DXF",
    description: "Directory for generated DXF files.",
  }),
  png: Schema.String.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultPaths.png)),
  ).annotate({
    title: "PNG",
    description: "Directory for generated PNG previews.",
  }),
  gerbers: Schema.String.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultPaths.gerbers)),
  ).annotate({
    title: "Gerbers",
    description: "Directory for exported Gerber files.",
  }),
  drills: Schema.String.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultPaths.drills)),
  ).annotate({
    title: "Drills",
    description: "Directory for generated drill files.",
  }),
  xtool: Schema.String.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultPaths.xtool)),
  ).annotate({
    title: "xTool",
    description: "Directory for xTool Studio artifacts.",
  }),
  place: Schema.String.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultPaths.place)),
  ).annotate({
    title: "Place",
    description: "Directory for placement files.",
  }),
  cnc: Schema.String.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultPaths.cnc)),
  ).annotate({
    title: "CNC",
    description: "Directory for generated CNC G-code.",
  }),
}).annotate({
  title: "Output paths",
  description: "Output directories for generated artifacts.",
});

export const XToolSchema = Schema.Struct({
  appPath: Schema.String.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultXTool.appPath)),
  ).annotate({
    title: "App path",
    description: "Path to the xTool Studio application.",
  }),
  cdpHost: Schema.String.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultXTool.cdpHost)),
  ).annotate({
    title: "CDP host",
    description: "Chrome DevTools Protocol host for xTool Studio.",
  }),
  cdpPort: Schema.Number.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultXTool.cdpPort)),
  ).annotate({
    title: "CDP port",
    description: "Chrome DevTools Protocol port for xTool Studio.",
  }),
  window: WindowSchema.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultXToolWindow)),
  ).annotate({
    title: "Window",
    description: "xTool Studio automation window size.",
  }),
  existingProcess: Schema.Literals(["prompt"])
    .pipe(
      Schema.withDecodingDefault(Effect.succeed(defaultXTool.existingProcess)),
    )
    .annotate({
      title: "Existing process",
      description:
        'Behaviour when xTool Studio is already running ("prompt" asks).',
    }),
}).annotate({
  title: "xTool",
  description: "xTool Studio automation settings.",
});

export const MakeracamStepSchema = Schema.Struct({
  generate: Schema.Boolean.pipe(
    Schema.withDecodingDefault(Effect.succeed(true)),
  ).annotate({
    title: "Generate",
    description: "Whether this MakeraCAM step runs.",
  }),
}).annotate({
  title: "MakeraCAM step",
  description: "Toggle for a MakeraCAM generation step.",
});

export const MakeracamSchema = Schema.Struct({
  appPath: Schema.String.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultMakeracam.appPath)),
  ).annotate({
    title: "App path",
    description: "Path to the MakeraCAM application.",
  }),
  cutDepthMm: Schema.Number.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultMakeracam.cutDepthMm)),
  ).annotate({ title: "Cut depth", description: "Contour cut depth (mm)." }),
  tabsPerContour: Schema.Number.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultMakeracam.tabsPerContour)),
  ).annotate({
    title: "Tabs per contour",
    description: "Number of holding tabs generated per contour.",
  }),
  existingProcess: Schema.Literals(["prompt"])
    .pipe(
      Schema.withDecodingDefault(
        Effect.succeed(defaultMakeracam.existingProcess),
      ),
    )
    .annotate({
      title: "Existing process",
      description:
        'Behaviour when MakeraCAM is already running ("prompt" asks).',
    }),
  window: WindowSchema.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultMakeracamWindow)),
  ).annotate({
    title: "Window",
    description: "MakeraCAM automation window size.",
  }),
  platedHoles: MakeracamStepSchema.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultMakeracam.platedHoles)),
  ).annotate({
    title: "Plated holes",
    description: "Generate the plated-holes CNC step.",
  }),
  finalCut: MakeracamStepSchema.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultMakeracam.finalCut)),
  ).annotate({
    title: "Final cut",
    description: "Generate the final contour CNC step.",
  }),
}).annotate({
  title: "MakeraCAM",
  description: "MakeraCAM automation settings.",
});

export const SolderMaskXToolSchema = Schema.Struct({
  device: Schema.Literal("M1 Ultra")
    .pipe(
      Schema.withDecodingDefault(Effect.succeed(defaultSolderMaskXTool.device)),
    )
    .annotate({
      title: "Device",
      description: "xTool laser device used for solder mask.",
    }),
  intensity: Schema.Number.pipe(
    Schema.withDecodingDefault(
      Effect.succeed(defaultSolderMaskXTool.intensity),
    ),
  ).annotate({ title: "Intensity", description: "Laser intensity (%)." }),
  passes: Schema.Number.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultSolderMaskXTool.passes)),
  ).annotate({ title: "Passes", description: "Number of laser passes." }),
}).annotate({
  title: "xTool",
  description: "xTool exposure settings for solder mask.",
});

export const StencilXToolSchema = Schema.Struct({
  device: Schema.Literal("F1 Ultra")
    .pipe(
      Schema.withDecodingDefault(Effect.succeed(defaultStencilXTool.device)),
    )
    .annotate({
      title: "Device",
      description: "xTool device used to cut the stencil.",
    }),
  power: Schema.Number.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultStencilXTool.power)),
  ).annotate({ title: "Power", description: "Laser power (%)." }),
  speed: Schema.Number.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultStencilXTool.speed)),
  ).annotate({ title: "Speed", description: "Cutting speed (mm/min)." }),
  passes: Schema.Number.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultStencilXTool.passes)),
  ).annotate({ title: "Passes", description: "Number of laser passes." }),
}).annotate({
  title: "xTool",
  description: "xTool cutting settings for the stencil.",
});

export const AlignmentDrillsSchema = Schema.Struct({
  generate: Schema.Boolean.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultAlignmentDrills.generate)),
  ).annotate({
    title: "Generate",
    description: "Whether alignment drills are generated.",
  }),
  distance: DistanceSchema.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultAlignmentDrillDistance)),
  ).annotate({
    title: "Spacing",
    description: "Inset of alignment drills from the board edges (mm).",
  }),
  diameter: Schema.Number.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultAlignmentDrills.diameter)),
  ).annotate({
    title: "Diameter",
    description: "Alignment drill diameter (mm).",
  }),
}).annotate({
  title: "Alignment drills",
  description: "Registration drill holes for double-sided alignment.",
});

export const ElectroplatingContainerSchema = Schema.Struct({
  waterMl: Schema.Number.pipe(
    Schema.withDecodingDefault(
      Effect.succeed(defaultElectroplatingContainer.waterMl),
    ),
  ).annotate({
    title: "Bath water",
    description: "Volume of water in the bath (mL).",
  }),
  maxBoardWidthMm: Schema.Number.pipe(Schema.optional).annotate({
    title: "Max board width",
    description: "Maximum board width that fits the bath (mm).",
  }),
  maxBoardHeightMm: Schema.Number.pipe(Schema.optional).annotate({
    title: "Max board height",
    description: "Maximum board height that fits the bath (mm).",
  }),
  allowRotation: Schema.Boolean.pipe(
    Schema.withDecodingDefault(
      Effect.succeed(defaultElectroplatingContainer.allowRotation),
    ),
  ).annotate({
    title: "Allow rotation",
    description: "Allow rotating the board to fit the bath.",
  }),
}).annotate({
  title: "Container",
  description: "Electroplating bath container constraints.",
});

export const ElectroplatingGramsPerLiterSchema = Schema.Struct({
  gramsPerLiter: Schema.Number.annotate({
    title: "Grams per litre",
    description: "Concentration (g/L).",
  }),
}).annotate({
  title: "Mass concentration",
  description: "Concentration expressed in grams per litre.",
});

export const ElectroplatingMillilitersPerLiterSchema = Schema.Struct({
  millilitersPerLiter: Schema.Number.annotate({
    title: "Millilitres per litre",
    description: "Concentration (mL/L).",
  }),
}).annotate({
  title: "Volume concentration",
  description: "Concentration expressed in millilitres per litre.",
});

export const ElectroplatingHclSchema = Schema.Struct({
  solutionConcentrationPercent: Schema.Number.pipe(
    Schema.withDecodingDefault(
      Effect.succeed(
        defaultElectroplatingRecipe.hcl.solutionConcentrationPercent,
      ),
    ),
  ).annotate({
    title: "Solution concentration",
    description: "Concentration of the HCl stock solution (%).",
  }),
  referenceConcentrationPercent: Schema.Number.pipe(
    Schema.withDecodingDefault(
      Effect.succeed(
        defaultElectroplatingRecipe.hcl.referenceConcentrationPercent,
      ),
    ),
  ).annotate({
    title: "Reference concentration",
    description: "Reference concentration the dose is calibrated against (%).",
  }),
  referenceMillilitersPerLiter: Schema.Number.pipe(
    Schema.withDecodingDefault(
      Effect.succeed(
        defaultElectroplatingRecipe.hcl.referenceMillilitersPerLiter,
      ),
    ),
  ).annotate({
    title: "Reference dose",
    description: "Reference dose at the reference concentration (mL/L).",
  }),
}).annotate({
  title: "HCl",
  description: "Hydrochloric acid dosing.",
});

export const ElectroplatingRecipeSchema = Schema.Struct({
  currentDensityMaPerCm2: Schema.Number.pipe(
    Schema.withDecodingDefault(
      Effect.succeed(defaultElectroplatingRecipe.currentDensityMaPerCm2),
    ),
  ).annotate({
    title: "Current density",
    description: "Plating current density (mA/cm²).",
  }),
  durationMinutes: Schema.Number.pipe(
    Schema.withDecodingDefault(
      Effect.succeed(defaultElectroplatingRecipe.durationMinutes),
    ),
  ).annotate({ title: "Duration", description: "Plating duration (minutes)." }),
  stirRpm: Schema.Number.pipe(
    Schema.withDecodingDefault(
      Effect.succeed(defaultElectroplatingRecipe.stirRpm),
    ),
  ).annotate({
    title: "Stir speed",
    description: "Magnetic stirrer speed (rpm).",
  }),
  targetCopperMicrons: Schema.Number.pipe(
    Schema.withDecodingDefault(
      Effect.succeed(defaultElectroplatingRecipe.targetCopperMicrons),
    ),
  ).annotate({
    title: "Target copper",
    description: "Target deposited copper thickness (µm).",
  }),
  voltageLimitV: Schema.Number.pipe(
    Schema.withDecodingDefault(
      Effect.succeed(defaultElectroplatingRecipe.voltageLimitV),
    ),
  ).annotate({
    title: "Voltage limit",
    description: "Power-supply voltage limit (V).",
  }),
  copperSulfatePentahydrate: ElectroplatingGramsPerLiterSchema.pipe(
    Schema.withDecodingDefault(
      Effect.succeed(defaultElectroplatingRecipe.copperSulfatePentahydrate),
    ),
  ).annotate({
    title: "Copper sulfate pentahydrate",
    description: "Copper(II) sulfate pentahydrate concentration.",
  }),
  citricAcid: ElectroplatingGramsPerLiterSchema.pipe(
    Schema.withDecodingDefault(
      Effect.succeed(defaultElectroplatingRecipe.citricAcid),
    ),
  ).annotate({
    title: "Citric acid",
    description: "Citric acid concentration.",
  }),
  polysorbate20: ElectroplatingMillilitersPerLiterSchema.pipe(
    Schema.withDecodingDefault(
      Effect.succeed(defaultElectroplatingRecipe.polysorbate20),
    ),
  ).annotate({
    title: "Polysorbate 20",
    description: "Polysorbate 20 (Tween 20) concentration.",
  }),
  hcl: ElectroplatingHclSchema.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultElectroplatingRecipe.hcl)),
  ).annotate({
    title: "HCl",
    description: "Hydrochloric acid dosing.",
  }),
}).annotate({
  title: "Recipe",
  description: "Copper electroplating recipe and bath chemistry.",
});

export const ElectroplatingSchema = Schema.Struct({
  generateEdgeCutsWithAlignmentDrills: Schema.Boolean.pipe(
    Schema.withDecodingDefault(
      Effect.succeed(defaultElectroplating.generateEdgeCutsWithAlignmentDrills),
    ),
  ).annotate({
    title: "Edge cuts with alignment drills",
    description: "Generate edge cuts together with alignment drills.",
  }),
  additionalDistance: EdgeDistanceSchema.pipe(
    Schema.withDecodingDefault(
      Effect.succeed(defaultElectroplatingAdditionalDistance),
    ),
  ).annotate({
    title: "Additional distance",
    description: "Extra board outline offset per edge for plating (mm).",
  }),
  cornerRadius: Schema.Number.pipe(
    Schema.withDecodingDefault(
      Effect.succeed(defaultElectroplating.cornerRadius),
    ),
  ).annotate({
    title: "Corner radius",
    description: "Corner radius of the plating outline (mm).",
  }),
  container: ElectroplatingContainerSchema.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultElectroplatingContainer)),
  ).annotate({
    title: "Container",
    description: "Electroplating bath container constraints.",
  }),
  recipe: ElectroplatingRecipeSchema.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultElectroplatingRecipe)),
  ).annotate({
    title: "Recipe",
    description: "Copper electroplating recipe and bath chemistry.",
  }),
}).annotate({
  title: "Electroplating",
  description: "Copper electroplating and bath settings.",
});

export const BoardSchema = Schema.Struct({
  autoFix: Schema.Boolean.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultBoard.autoFix)),
  ).annotate({
    title: "Auto-fix board",
    description: "Automatically fix detected board issues.",
  }),
  file: Schema.String.pipe(Schema.optional).annotate({
    title: "Board file",
    description: "Path to the KiCad board file (auto-detected if unset).",
  }),
  ignoreSide: SideSchema.pipe(
    Schema.NullOr,
    Schema.withDecodingDefault(Effect.succeed(defaultBoard.ignoreSide)),
  ).annotate({
    title: "Ignored side",
    description: "Skip processing one side of the board.",
  }),
}).annotate({
  title: "Board",
  description: "Source board file and handling.",
});

export const SolderMaskSchema = Schema.Struct({
  generate: Schema.Boolean.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultSolderMask.generate)),
  ).annotate({
    title: "Generate",
    description: "Whether the solder mask is generated.",
  }),
  double: Schema.Boolean.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultSolderMask.double)),
  ).annotate({
    title: "Double",
    description: "Expose the solder mask twice.",
  }),
  excludeSides: Schema.Array(SideSchema)
    .pipe(
      Schema.withDecodingDefault(
        Effect.succeed(defaultSolderMask.excludeSides),
      ),
    )
    .annotate({
      title: "Exclude sides",
      description: "Sides to exclude from the solder mask.",
    }),
  distance: DistanceSchema.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultSolderMaskDistance)),
  ).annotate({
    title: "Expansion",
    description: "Solder mask expansion around pads (mm).",
  }),
  xtool: SolderMaskXToolSchema.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultSolderMaskXTool)),
  ).annotate({
    title: "xTool",
    description: "xTool exposure settings for solder mask.",
  }),
}).annotate({
  title: "Solder mask",
  description: "Solder mask generation settings.",
});

export const StencilSchema = Schema.Struct({
  generate: Schema.Boolean.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultStencil.generate)),
  ).annotate({
    title: "Generate",
    description: "Whether the stencil is generated.",
  }),
  excludeSides: Schema.Array(SideSchema)
    .pipe(
      Schema.withDecodingDefault(Effect.succeed(defaultStencil.excludeSides)),
    )
    .annotate({
      title: "Exclude sides",
      description: "Sides to exclude from the stencil.",
    }),
  xtool: StencilXToolSchema.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultStencilXTool)),
  ).annotate({
    title: "xTool",
    description: "xTool cutting settings for the stencil.",
  }),
}).annotate({
  title: "Stencil",
  description: "Solder paste stencil settings.",
});

export const DrillsSchema = Schema.Struct({
  generate: Schema.Boolean.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultDrills.generate)),
  ).annotate({
    title: "Generate",
    description: "Whether drill files are generated.",
  }),
  withEdgeCuts: Schema.Boolean.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultDrills.withEdgeCuts)),
  ).annotate({
    title: "With edge cuts",
    description: "Include edge cuts in the drill output.",
  }),
}).annotate({
  title: "Drills",
  description: "Drill file generation settings.",
});

export const PlaceSchema = Schema.Struct({
  generate: Schema.Boolean.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultPlace.generate)),
  ).annotate({
    title: "Generate",
    description: "Whether placement files are generated.",
  }),
}).annotate({
  title: "Placement",
  description: "Component placement output settings.",
});

export const CncVBitSchema = Schema.Struct({
  type: Schema.Literal("vbit")
    .pipe(Schema.withDecodingDefault(Effect.succeed(defaultCncVBitTool.type)))
    .annotate({ title: "Type", description: 'Tool kind ("vbit").' }),
  diameter: Schema.Number.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultCncVBitTool.diameter)),
  ).annotate({ title: "Diameter", description: "Tip diameter (mm)." }),
  angle: Schema.Number.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultCncVBitTool.angle)),
  ).annotate({
    title: "V-bit angle",
    description: "Included tip angle (degrees).",
  }),
}).annotate({
  title: "V-bit",
  description: "V-shaped engraving bit.",
});

export const CncMillBitSchema = Schema.Struct({
  type: Schema.Literal("mill")
    .pipe(Schema.withDecodingDefault(Effect.succeed(defaultCncMillTool.type)))
    .annotate({ title: "Type", description: 'Tool kind ("mill").' }),
  diameter: Schema.Number.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultCncMillTool.diameter)),
  ).annotate({ title: "Diameter", description: "Cutter diameter (mm)." }),
  feedRate: Schema.Number.pipe(Schema.optional).annotate({
    title: "Feed rate",
    description: "Override XY feed rate (mm/min).",
  }),
  zCutFeedRate: Schema.Number.pipe(Schema.optional).annotate({
    title: "Z feed rate",
    description: "Override plunge feed rate (mm/min).",
  }),
  spindleSpeed: Schema.Number.pipe(Schema.optional).annotate({
    title: "Spindle speed",
    description: "Override spindle speed (rpm).",
  }),
  zCutDepth: Schema.Number.pipe(Schema.optional).annotate({
    title: "Z cut depth",
    description: "Override per-pass cut depth (mm).",
  }),
}).annotate({
  title: "Mill",
  description: "Flat end mill.",
});

export const CncDrillSchema = Schema.Struct({
  type: Schema.Literal("drill")
    .pipe(Schema.withDecodingDefault(Effect.succeed(defaultCncDrillTool.type)))
    .annotate({ title: "Type", description: 'Tool kind ("drill").' }),
  diameter: Schema.Number.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultCncDrillTool.diameter)),
  ).annotate({ title: "Diameter", description: "Drill diameter (mm)." }),
}).annotate({
  title: "Drill",
  description: "Drill bit.",
});

export const CncToolSchema = Schema.Union([
  CncVBitSchema,
  CncMillBitSchema,
  CncDrillSchema,
]).annotate({
  title: "Cutting tool",
  description: "A V-bit, mill, or drill tool.",
});

export const CncIsolationSchema = Schema.Struct({
  feedRate: Schema.Number.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultCncIsolation.feedRate)),
  ).annotate({ title: "Feed rate", description: "XY feed rate (mm/min)." }),
  spindleSpeed: Schema.Number.pipe(
    Schema.withDecodingDefault(
      Effect.succeed(defaultCncIsolation.spindleSpeed),
    ),
  ).annotate({ title: "Spindle speed", description: "Spindle speed (rpm)." }),
  zCutDepth: Schema.Number.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultCncIsolation.zCutDepth)),
  ).annotate({ title: "Z cut depth", description: "Per-pass cut depth (mm)." }),
  zCutFeedRate: Schema.Number.pipe(
    Schema.withDecodingDefault(
      Effect.succeed(defaultCncIsolation.zCutFeedRate),
    ),
  ).annotate({
    title: "Z feed rate",
    description: "Plunge feed rate (mm/min).",
  }),
  tool: CncToolSchema.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultCncIsolation.tool)),
  ).annotate({
    title: "Tool",
    description: "Tool used for isolation routing.",
  }),
  passes: Schema.Number.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultCncIsolation.passes)),
  ).annotate({ title: "Passes", description: "Number of isolation passes." }),
  overlap: Schema.Number.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultCncIsolation.overlap)),
  ).annotate({ title: "Overlap", description: "Pass overlap (%)." }),
  isoType: Schema.Literals([0, 1, 2])
    .pipe(
      Schema.withDecodingDefault(Effect.succeed(defaultCncIsolation.isoType)),
    )
    .annotate({
      title: "Isolation type",
      description: "0 = exteriors, 1 = interiors, 2 = full.",
    }),
}).annotate({
  title: "Isolation",
  description: "Copper isolation routing settings.",
});

export const CncNonCopperClearingSchema = Schema.Struct({
  feedRate: Schema.Number.pipe(
    Schema.withDecodingDefault(
      Effect.succeed(defaultCncNonCopperClearing.feedRate),
    ),
  ).annotate({ title: "Feed rate", description: "XY feed rate (mm/min)." }),
  spindleSpeed: Schema.Number.pipe(
    Schema.withDecodingDefault(
      Effect.succeed(defaultCncNonCopperClearing.spindleSpeed),
    ),
  ).annotate({ title: "Spindle speed", description: "Spindle speed (rpm)." }),
  zCutDepth: Schema.Number.pipe(
    Schema.withDecodingDefault(
      Effect.succeed(defaultCncNonCopperClearing.zCutDepth),
    ),
  ).annotate({ title: "Z cut depth", description: "Per-pass cut depth (mm)." }),
  zCutFeedRate: Schema.Number.pipe(
    Schema.withDecodingDefault(
      Effect.succeed(defaultCncNonCopperClearing.zCutFeedRate),
    ),
  ).annotate({
    title: "Z feed rate",
    description: "Plunge feed rate (mm/min).",
  }),
  tool: CncToolSchema.pipe(
    Schema.withDecodingDefault(
      Effect.succeed(defaultCncNonCopperClearing.tool),
    ),
  ).annotate({
    title: "Tool",
    description: "Tool used for non-copper clearing.",
  }),
  overlap: Schema.Number.pipe(
    Schema.withDecodingDefault(
      Effect.succeed(defaultCncNonCopperClearing.overlap),
    ),
  ).annotate({ title: "Overlap", description: "Pass overlap (%)." }),
  margin: Schema.Number.pipe(
    Schema.withDecodingDefault(
      Effect.succeed(defaultCncNonCopperClearing.margin),
    ),
  ).annotate({
    title: "Margin",
    description: "Margin left around copper (mm).",
  }),
  method: Schema.Literals(["standard", "seed", "lines"])
    .pipe(
      Schema.withDecodingDefault(
        Effect.succeed(defaultCncNonCopperClearing.method),
      ),
    )
    .annotate({
      title: "Method",
      description: 'Clearing strategy ("standard", "seed", or "lines").',
    }),
  millZCutDepth: Schema.Number.pipe(
    Schema.withDecodingDefault(
      Effect.succeed(defaultCncNonCopperClearing.millZCutDepth),
    ),
  ).annotate({
    title: "Mill Z cut depth",
    description: "Per-pass cut depth when using a mill (mm).",
  }),
}).annotate({
  title: "Non-copper clearing",
  description: "Clears copper from non-trace areas.",
});

export const CncClearanceSchema = Schema.Struct({
  travelZ: Schema.Number.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultCncClearance.travelZ)),
  ).annotate({
    title: "Travel Z",
    description: "Z height for rapid travel moves (mm).",
  }),
  endZ: Schema.Number.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultCncClearance.endZ)),
  ).annotate({
    title: "End Z",
    description: "Z height at the end of the job (mm).",
  }),
  rapidFeedRate: Schema.Number.pipe(
    Schema.withDecodingDefault(
      Effect.succeed(defaultCncClearance.rapidFeedRate),
    ),
  ).annotate({
    title: "Rapid feed rate",
    description: "Feed rate for rapid moves (mm/min).",
  }),
  seamZ: Schema.Number.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultCncClearance.seamZ)),
  ).annotate({
    title: "Seam Z",
    description: "Z height for seam moves (mm).",
  }),
}).annotate({
  title: "Clearance",
  description: "Travel and safety heights.",
});

export const CncBacksideSchema = Schema.Struct({
  mirrorAxis: Schema.Literals(["X", "Y"])
    .pipe(
      Schema.withDecodingDefault(Effect.succeed(defaultCncBackside.mirrorAxis)),
    )
    .annotate({
      title: "Mirror axis",
      description: "Axis to mirror across for backside jobs (X or Y).",
    }),
}).annotate({
  title: "Backside",
  description: "Backside machining settings.",
});

export const CncDrillingSchema = Schema.Struct({
  matchToleranceMm: Schema.Number.pipe(
    Schema.withDecodingDefault(
      Effect.succeed(defaultCncDrilling.matchToleranceMm),
    ),
  ).annotate({
    title: "Match tolerance",
    description: "Tolerance when matching holes to drill tools (mm).",
  }),
}).annotate({
  title: "Drilling",
  description: "Drill matching settings.",
});

export const CncSchema = Schema.Struct({
  isolation: CncIsolationSchema.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultCncIsolation)),
  ).annotate({
    title: "Isolation",
    description: "Copper isolation routing settings.",
  }),
  nonCopperClearing: CncNonCopperClearingSchema.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultCncNonCopperClearing)),
  ).annotate({
    title: "Non-copper clearing",
    description: "Clears copper from non-trace areas.",
  }),
  clearance: CncClearanceSchema.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultCncClearance)),
  ).annotate({
    title: "Clearance",
    description: "Travel and safety heights.",
  }),
  backside: CncBacksideSchema.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultCncBackside)),
  ).annotate({
    title: "Backside",
    description: "Backside machining settings.",
  }),
  drilling: CncDrillingSchema.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultCncDrilling)),
  ).annotate({
    title: "Drilling",
    description: "Drill matching settings.",
  }),
  availableDrills: Schema.Array(CncDrillSchema)
    .pipe(Schema.withDecodingDefault(Effect.succeed(defaultAvailableDrills)))
    .annotate({
      title: "Available drills",
      description: "Drill tools available to the machine.",
    }),
  availableMills: Schema.Array(CncMillBitSchema)
    .pipe(Schema.withDecodingDefault(Effect.succeed(defaultAvailableMills)))
    .annotate({
      title: "Available mills",
      description: "Mill tools available to the machine.",
    }),
}).annotate({
  title: "CNC",
  description: "CNC milling and drilling settings.",
});

export const ValidationRangesSchema = Schema.Struct({
  distanceMm: RangeSchema.pipe(
    Schema.withDecodingDefault(
      Effect.succeed(defaultValidationRanges.distanceMm),
    ),
  ).annotate({
    title: "Distance (mm)",
    description: "Valid range for distance values (mm).",
  }),
  toolDiameterMm: RangeSchema.pipe(
    Schema.withDecodingDefault(
      Effect.succeed(defaultValidationRanges.toolDiameterMm),
    ),
  ).annotate({
    title: "Tool diameter (mm)",
    description: "Valid range for tool diameters (mm).",
  }),
  feedRate: RangeSchema.pipe(
    Schema.withDecodingDefault(
      Effect.succeed(defaultValidationRanges.feedRate),
    ),
  ).annotate({
    title: "Feed rate",
    description: "Valid range for feed rates (mm/min).",
  }),
  spindleSpeed: RangeSchema.pipe(
    Schema.withDecodingDefault(
      Effect.succeed(defaultValidationRanges.spindleSpeed),
    ),
  ).annotate({
    title: "Spindle speed",
    description: "Valid range for spindle speeds (rpm).",
  }),
  cutDepthMm: RangeSchema.pipe(
    Schema.withDecodingDefault(
      Effect.succeed(defaultValidationRanges.cutDepthMm),
    ),
  ).annotate({
    title: "Cut depth (mm)",
    description: "Valid range for cut depths (mm).",
  }),
  angleDegrees: RangeSchema.pipe(
    Schema.withDecodingDefault(
      Effect.succeed(defaultValidationRanges.angleDegrees),
    ),
  ).annotate({
    title: "Angle (degrees)",
    description: "Valid range for angles (degrees).",
  }),
  xtoolPercent: RangeSchema.pipe(
    Schema.withDecodingDefault(
      Effect.succeed(defaultValidationRanges.xtoolPercent),
    ),
  ).annotate({
    title: "xTool percent",
    description: "Valid range for xTool percentage values (%).",
  }),
  xtoolPasses: RangeSchema.pipe(
    Schema.withDecodingDefault(
      Effect.succeed(defaultValidationRanges.xtoolPasses),
    ),
  ).annotate({
    title: "xTool passes",
    description: "Valid range for xTool pass counts.",
  }),
  xtoolSpeed: RangeSchema.pipe(
    Schema.withDecodingDefault(
      Effect.succeed(defaultValidationRanges.xtoolSpeed),
    ),
  ).annotate({
    title: "xTool speed",
    description: "Valid range for xTool speeds (mm/min).",
  }),
  electroplatingBoardSizeMm: RangeSchema.pipe(
    Schema.withDecodingDefault(
      Effect.succeed(defaultValidationRanges.electroplatingBoardSizeMm),
    ),
  ).annotate({
    title: "Electroplating board size (mm)",
    description: "Valid range for plated board dimensions (mm).",
  }),
  electroplatingVolumeMl: RangeSchema.pipe(
    Schema.withDecodingDefault(
      Effect.succeed(defaultValidationRanges.electroplatingVolumeMl),
    ),
  ).annotate({
    title: "Electroplating volume (mL)",
    description: "Valid range for bath volume (mL).",
  }),
  electroplatingCurrentDensityMaPerCm2: RangeSchema.pipe(
    Schema.withDecodingDefault(
      Effect.succeed(
        defaultValidationRanges.electroplatingCurrentDensityMaPerCm2,
      ),
    ),
  ).annotate({
    title: "Electroplating current density",
    description: "Valid range for current density (mA/cm²).",
  }),
  electroplatingDurationMinutes: RangeSchema.pipe(
    Schema.withDecodingDefault(
      Effect.succeed(defaultValidationRanges.electroplatingDurationMinutes),
    ),
  ).annotate({
    title: "Electroplating duration",
    description: "Valid range for plating duration (minutes).",
  }),
  electroplatingStirRpm: RangeSchema.pipe(
    Schema.withDecodingDefault(
      Effect.succeed(defaultValidationRanges.electroplatingStirRpm),
    ),
  ).annotate({
    title: "Electroplating stir speed",
    description: "Valid range for stirrer speed (rpm).",
  }),
  electroplatingMicrons: RangeSchema.pipe(
    Schema.withDecodingDefault(
      Effect.succeed(defaultValidationRanges.electroplatingMicrons),
    ),
  ).annotate({
    title: "Electroplating copper thickness",
    description: "Valid range for deposited copper thickness (µm).",
  }),
  electroplatingVoltageV: RangeSchema.pipe(
    Schema.withDecodingDefault(
      Effect.succeed(defaultValidationRanges.electroplatingVoltageV),
    ),
  ).annotate({
    title: "Electroplating voltage",
    description: "Valid range for voltage (V).",
  }),
  electroplatingMassGramsPerLiter: RangeSchema.pipe(
    Schema.withDecodingDefault(
      Effect.succeed(defaultValidationRanges.electroplatingMassGramsPerLiter),
    ),
  ).annotate({
    title: "Electroplating mass concentration",
    description: "Valid range for mass concentration (g/L).",
  }),
  electroplatingLiquidMillilitersPerLiter: RangeSchema.pipe(
    Schema.withDecodingDefault(
      Effect.succeed(
        defaultValidationRanges.electroplatingLiquidMillilitersPerLiter,
      ),
    ),
  ).annotate({
    title: "Electroplating liquid concentration",
    description: "Valid range for liquid concentration (mL/L).",
  }),
  electroplatingConcentrationPercent: RangeSchema.pipe(
    Schema.withDecodingDefault(
      Effect.succeed(
        defaultValidationRanges.electroplatingConcentrationPercent,
      ),
    ),
  ).annotate({
    title: "Electroplating concentration",
    description: "Valid range for concentration (%).",
  }),
}).annotate({
  title: "Ranges",
  description: "Acceptable value ranges used during validation.",
});

export const IsolationFeasibilitySchema = Schema.Struct({
  enabled: Schema.Boolean.pipe(
    Schema.withDecodingDefault(
      Effect.succeed(defaultIsolationFeasibility.enabled),
    ),
  ).annotate({
    title: "Enabled",
    description: "Whether the isolation feasibility check runs.",
  }),
  onFailure: Schema.Literals(["error", "warn"])
    .pipe(
      Schema.withDecodingDefault(
        Effect.succeed(defaultIsolationFeasibility.onFailure),
      ),
    )
    .annotate({
      title: "On failure",
      description: 'Action on failure ("error" or "warn").',
    }),
  ignore: Schema.Array(Schema.String)
    .pipe(
      Schema.withDecodingDefault(
        Effect.succeed(defaultIsolationFeasibility.ignore),
      ),
    )
    .annotate({
      title: "Ignore",
      description: "Regular expressions for nets to ignore.",
    }),
}).annotate({
  title: "Isolation feasibility",
  description: "Pre-flight isolation feasibility check.",
});

export const DrillFeasibilitySchema = Schema.Struct({
  enabled: Schema.Boolean.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultDrillFeasibility.enabled)),
  ).annotate({
    title: "Enabled",
    description: "Whether the drill feasibility check runs.",
  }),
  onFailure: Schema.Literals(["error", "warn"])
    .pipe(
      Schema.withDecodingDefault(
        Effect.succeed(defaultDrillFeasibility.onFailure),
      ),
    )
    .annotate({
      title: "On failure",
      description: 'Action on failure ("error" or "warn").',
    }),
}).annotate({
  title: "Drill feasibility",
  description: "Pre-flight drill feasibility check.",
});

export const ValidationSchema = Schema.Struct({
  ranges: ValidationRangesSchema.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultValidation.ranges)),
  ).annotate({
    title: "Ranges",
    description: "Acceptable value ranges used during validation.",
  }),
  isolationFeasibility: IsolationFeasibilitySchema.pipe(
    Schema.withDecodingDefault(
      Effect.succeed(defaultValidation.isolationFeasibility),
    ),
  ).annotate({
    title: "Isolation feasibility",
    description: "Pre-flight isolation feasibility check.",
  }),
  drillFeasibility: DrillFeasibilitySchema.pipe(
    Schema.withDecodingDefault(
      Effect.succeed(defaultValidation.drillFeasibility),
    ),
  ).annotate({
    title: "Drill feasibility",
    description: "Pre-flight drill feasibility check.",
  }),
}).annotate({
  title: "Validation",
  description: "Configuration validation settings.",
});
