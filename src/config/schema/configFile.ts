import { Effect, Schema } from "effect";
import { defaultConfigFile } from "./defaults";
import {
  AlignmentDrillsSchema,
  BoardSchema,
  CncSchema,
  DependenciesSchema,
  DrillsSchema,
  ElectroplatingSchema,
  MakeracamSchema,
  PathsSchema,
  PlaceSchema,
  SkillsSchema,
  SolderMaskSchema,
  StencilSchema,
  ValidationSchema,
  XToolSchema,
} from "./sections";

export const ConfigFileSchema = Schema.Struct({
  extends: Schema.Array(Schema.String)
    .pipe(Schema.withDecodingDefault(Effect.succeed(defaultConfigFile.extends)))
    .annotate({
      title: "Extends",
      description:
        "Parent config files to inherit from (later entries override earlier).",
    }),
  projectDir: Schema.String.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultConfigFile.projectDir)),
  ).annotate({
    title: "Project directory",
    description: "Project directory relative to the config file.",
  }),
  skipRenderBoard: Schema.Boolean.pipe(
    Schema.withDecodingDefault(
      Effect.succeed(defaultConfigFile.skipRenderBoard),
    ),
  ).annotate({
    title: "Skip board preview",
    description: "Skip rendering the board preview image.",
  }),
  skills: SkillsSchema.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultConfigFile.skills)),
  ).annotate({
    title: "Skills",
    description: "Agent skill installation settings.",
  }),
  dependencies: DependenciesSchema.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultConfigFile.dependencies)),
  ).annotate({
    title: "Dependencies",
    description: "External tool locations.",
  }),
  paths: PathsSchema.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultConfigFile.paths)),
  ).annotate({
    title: "Output paths",
    description: "Output directories for generated artifacts.",
  }),
  board: BoardSchema.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultConfigFile.board)),
  ).annotate({
    title: "Board",
    description: "Source board file and handling.",
  }),
  alignmentDrills: AlignmentDrillsSchema.pipe(
    Schema.withDecodingDefault(
      Effect.succeed(defaultConfigFile.alignmentDrills),
    ),
  ).annotate({
    title: "Alignment drills",
    description: "Registration drill holes for double-sided alignment.",
  }),
  electroplating: ElectroplatingSchema.pipe(
    Schema.withDecodingDefault(
      Effect.succeed(defaultConfigFile.electroplating),
    ),
  ).annotate({
    title: "Electroplating",
    description: "Copper electroplating and bath settings.",
  }),
  solderMask: SolderMaskSchema.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultConfigFile.solderMask)),
  ).annotate({
    title: "Solder mask",
    description: "Solder mask generation settings.",
  }),
  stencil: StencilSchema.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultConfigFile.stencil)),
  ).annotate({
    title: "Stencil",
    description: "Solder paste stencil settings.",
  }),
  drills: DrillsSchema.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultConfigFile.drills)),
  ).annotate({
    title: "Drills",
    description: "Drill file generation settings.",
  }),
  place: PlaceSchema.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultConfigFile.place)),
  ).annotate({
    title: "Placement",
    description: "Component placement output settings.",
  }),
  cnc: CncSchema.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultConfigFile.cnc)),
  ).annotate({
    title: "CNC",
    description: "CNC milling and drilling settings.",
  }),
  xtool: XToolSchema.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultConfigFile.xtool)),
  ).annotate({
    title: "xTool",
    description: "xTool Studio automation settings.",
  }),
  makeracam: MakeracamSchema.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultConfigFile.makeracam)),
  ).annotate({
    title: "MakeraCAM",
    description: "MakeraCAM automation settings.",
  }),
  validation: ValidationSchema.pipe(
    Schema.withDecodingDefault(Effect.succeed(defaultConfigFile.validation)),
  ).annotate({
    title: "Validation",
    description: "Configuration validation settings.",
  }),
}).annotate({
  title: "flatmaxx configuration",
  description:
    "Schema for flatmaxxing.toml, the flatmaxx project configuration file.",
});

export type ConfigFile = typeof ConfigFileSchema.Type;
