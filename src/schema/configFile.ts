import { Effect, Schema } from "effect";

export const DependenciesSchema = Schema.Struct({
  kicadCli: Schema.String.pipe(Schema.optional),
  docker: Schema.String.pipe(Schema.optional),
});

export const PathsSchema = Schema.Struct({
  additionalProjects: Schema.String.pipe(
    Schema.withDecodingDefault(Effect.succeed("./manufacture")),
  ),
  gcode: Schema.String.pipe(
    Schema.withDecodingDefault(Effect.succeed("./gcode")),
  ),
  svg: Schema.String.pipe(Schema.withDecodingDefault(Effect.succeed("./svg"))),
  dxf: Schema.String.pipe(Schema.withDecodingDefault(Effect.succeed("./dxf"))),
  png: Schema.String.pipe(Schema.withDecodingDefault(Effect.succeed("./png"))),
  gerber: Schema.String.pipe(
    Schema.withDecodingDefault(Effect.succeed("./gerbers")),
  ),
  place: Schema.String.pipe(
    Schema.withDecodingDefault(Effect.succeed("./pos")),
  ),
}).pipe(
  Schema.withDecodingDefault(
    Effect.succeed({
      additionalProjects: "./manufacture",
      gcode: "./gcode",
      svg: "./svg",
      dxf: "./dxf",
      png: "./png",
      gerber: "./gerbers",
      place: "./pos",
    }),
  ),
);

export const AlignmentDrillsSchema = Schema.Struct({
  generate: Schema.Boolean.pipe(
    Schema.optional,
    Schema.withDecodingDefault(Effect.succeed(false)),
  ),
  distance: Schema.Struct({
    x: Schema.Number.pipe(
      Schema.optional,
      Schema.withDecodingDefault(Effect.succeed(6)),
    ),
    y: Schema.Number.pipe(
      Schema.optional,
      Schema.withDecodingDefault(Effect.succeed(6)),
    ),
  }).pipe(Schema.withDecodingDefault(Effect.succeed({ x: 6, y: 6 }))),
}).pipe(
  Schema.withDecodingDefault(
    Effect.succeed({
      generate: false,
      distance: { x: 6, y: 6 },
    }),
  ),
);

export const ElectroplatingSchema = Schema.Struct({
  generateEdgeCutsWithAlignmentDrills: Schema.Boolean.pipe(
    Schema.withDecodingDefault(Effect.succeed(false)),
  ),
  additionalDistance: Schema.Struct({
    x: Schema.Number.pipe(
      Schema.optional,
      Schema.withDecodingDefault(Effect.succeed(0)),
    ),
    y: Schema.Number.pipe(
      Schema.optional,
      Schema.withDecodingDefault(Effect.succeed(0)),
    ),
  }).pipe(Schema.withDecodingDefault(Effect.succeed({ x: 0, y: 0 }))),
}).pipe(
  Schema.withDecodingDefault(
    Effect.succeed({
      generateEdgeCutsWithAlignmentDrills: false,
      additionalDistance: { x: 0, y: 0 },
    }),
  ),
);

export const BoardSchema = Schema.Struct({
  autoFix: Schema.Boolean.pipe(
    Schema.withDecodingDefault(Effect.succeed(false)),
  ),
  file: Schema.String.pipe(Schema.optional),
  ignoreSide: Schema.Literals(["front", "back"]).pipe(Schema.NullOr),
}).pipe(
  Schema.withDecodingDefault(
    Effect.succeed({
      autoFix: false,
      file: undefined,
      ignoreSide: null,
      alignmentDrills: undefined,
      electroplating: undefined,
    }),
  ),
);

export const solderMaskSchema = Schema.Struct({
  generate: Schema.Boolean.pipe(
    Schema.withDecodingDefault(Effect.succeed(false)),
  ),
  double: Schema.Boolean.pipe(
    Schema.withDecodingDefault(Effect.succeed(false)),
  ),
  distance: Schema.Struct({
    x: Schema.Number.pipe(
      Schema.optional,
      Schema.withDecodingDefault(Effect.succeed(0)),
    ),
    y: Schema.Number.pipe(
      Schema.optional,
      Schema.withDecodingDefault(Effect.succeed(0)),
    ),
  }).pipe(Schema.withDecodingDefault(Effect.succeed({ x: 6, y: 6 }))),
}).pipe(
  Schema.withDecodingDefault(
    Effect.succeed({
      generate: false,
      double: false,
      distance: { x: 6, y: 6 },
    }),
  ),
);

export const stencilSchema = Schema.Struct({
  generate: Schema.Boolean.pipe(
    Schema.withDecodingDefault(Effect.succeed(false)),
  ),
});

export const drillsSchema = Schema.Struct({
  generate: Schema.Boolean.pipe(
    Schema.withDecodingDefault(Effect.succeed(false)),
  ),
  withEdgeCuts: Schema.Boolean.pipe(
    Schema.withDecodingDefault(Effect.succeed(false)),
  ),
}).pipe(
  Schema.withDecodingDefault(
    Effect.succeed({
      generate: false,
      withEdgeCuts: false,
    }),
  ),
);

export const placeSchema = Schema.Struct({
  generate: Schema.Boolean.pipe(
    Schema.withDecodingDefault(Effect.succeed(false)),
  ),
});

export const CncVBitSchema = Schema.Struct({
  type: Schema.Literal("vbit"),
  diameter: Schema.Number.pipe(
    Schema.optional,
    Schema.withDecodingDefault(Effect.succeed(1.0)),
  ),
  angle: Schema.Number.pipe(
    Schema.optional,
    Schema.withDecodingDefault(Effect.succeed(45)),
  ),
}).pipe(
  Schema.withDecodingDefault(
    Effect.succeed({
      type: "vbit",
      diameter: 1.0,
      angle: 45,
    }),
  ),
);

export const CncMillBitSchema = Schema.Struct({
  type: Schema.Literal("mill"),
  diameter: Schema.Number.pipe(
    Schema.optional,
    Schema.withDecodingDefault(Effect.succeed(1.0)),
  ),
}).pipe(
  Schema.withDecodingDefault(
    Effect.succeed({
      type: "mill",
      diameter: 1.0,
    }),
  ),
);

export const CncDrillSchema = Schema.Struct({
  diameter: Schema.Number.pipe(
    Schema.optional,
    Schema.withDecodingDefault(Effect.succeed(1.0)),
  ),
}).pipe(
  Schema.withDecodingDefault(
    Effect.succeed({
      diameter: 1.0,
    }),
  ),
);

export const CncBitSchema = Schema.Union([
  CncVBitSchema,
  CncMillBitSchema,
  CncDrillSchema,
]);

export const CncSettingSchema = Schema.Struct({
  feedRate: Schema.Number.pipe(
    Schema.optional,
    Schema.withDecodingDefault(Effect.succeed(1000)),
  ),
  spindleSpeed: Schema.Number.pipe(
    Schema.optional,
    Schema.withDecodingDefault(Effect.succeed(10000)),
  ),
  zCutDepth: Schema.Number.pipe(
    Schema.optional,
    Schema.withDecodingDefault(Effect.succeed(0.1)),
  ),
  zCutFeedRate: Schema.Number.pipe(
    Schema.optional,
    Schema.withDecodingDefault(Effect.succeed(100)),
  ),
  tool: CncBitSchema.pipe(Schema.optional),
}).pipe(
  Schema.withDecodingDefault(
    Effect.succeed({
      feedRate: 1000,
      spindleSpeed: 10000,
      zCutDepth: 0.1,
      zCutFeedRate: 100,
      tool: undefined,
    }),
  ),
);

export const cncSchema = Schema.Struct({
  isolation: CncSettingSchema.pipe(Schema.optional),
  nonCopperClearing: CncSettingSchema.pipe(Schema.optional),
  availableDrills: Schema.Array(CncDrillSchema).pipe(Schema.optional),
  availableMills: Schema.Array(CncMillBitSchema).pipe(Schema.optional),
}).pipe(
  Schema.withDecodingDefault(
    Effect.succeed({
      isolation: undefined,
      nonCopperClearing: undefined,
      availableDrills: undefined,
      availableMills: undefined,
    }),
  ),
);

export const ConfigFileSchema = Schema.Struct({
  dependencies: Schema.optional(DependenciesSchema),
  paths: Schema.optional(PathsSchema),
  board: Schema.optional(BoardSchema),
  alignmentDrills: Schema.optional(AlignmentDrillsSchema),
  electroplating: Schema.optional(ElectroplatingSchema),
  solderMask: Schema.optional(solderMaskSchema),
  stencil: Schema.optional(stencilSchema),
  drills: Schema.optional(drillsSchema),
  place: Schema.optional(placeSchema),
  cnc: Schema.optional(cncSchema),
});
