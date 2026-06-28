import {
  buildBoardSelectionOptions,
  defaultFlatcam,
  defaultKicadCli,
  loadFlatmaxxConfig,
  type ResolvedConfig,
} from "@/config";
import { CliError } from "@/errors";
import {
  boardImageFileSuffix,
  ensureKicadExists,
  findPCBProject,
} from "@/stages";
import { Array, Effect, FileSystem, Option, Path } from "effect";
import { Argument, Flag } from "effect/unstable/cli";
import { buildCliOverrides, type CliAliasOverride } from "./cliOverrides";

export interface ProjectCliInput {
  readonly kicadProject: string;
}

export interface SharedCliInput {
  readonly pathToKicad: Option.Option<string>;
  readonly configPath: Option.Option<string>;
  readonly setOverrides: readonly string[];
  readonly unsetOverrides: readonly string[];
  readonly flatcam: Option.Option<string>;
  readonly boardFile: Option.Option<string>;
  readonly skipRenderBoard: Option.Option<boolean>;
  readonly gcodeDir: Option.Option<string>;
  readonly gerbersDir: Option.Option<string>;
  readonly pngDir: Option.Option<string>;
  readonly solderMask: Option.Option<boolean>;
  readonly stencil: Option.Option<boolean>;
  readonly drills: Option.Option<boolean>;
  readonly place: Option.Option<boolean>;
  readonly isolationFeedRate: Option.Option<number>;
  readonly isolationToolDiameter: Option.Option<number>;
  readonly xtoolCdpPort: Option.Option<number>;
}

export type FlatmaxxCliInput = ProjectCliInput & SharedCliInput;

export interface FlatmaxxProjectContext {
  readonly config: ResolvedConfig;
  readonly projectDir: string;
  readonly kicadCli: string;
  readonly pcbFile: string;
  readonly pcbName: string;
}

export const projectArgument = Argument.string("kicad-project").pipe(
  Argument.withDescription("The path to the KiCAD project directory."),
  Argument.withDefault(process.cwd()),
);

export const sharedFlags = {
  pathToKicad: Flag.string("path-to-kicad").pipe(
    Flag.withAlias("-k"),
    Flag.withDescription("The path to the KiCAD CLI executable."),
    Flag.optional,
  ),
  configPath: Flag.string("config").pipe(
    Flag.withAlias("-c"),
    Flag.withDescription("The path to a flatmaxxing TOML config file."),
    Flag.optional,
  ),
  setOverrides: Flag.string("set").pipe(
    Flag.atMost(Number.MAX_SAFE_INTEGER),
    Flag.withMetavar("path=value"),
    Flag.withDescription(
      "Override any config value with a TOML literal, for example --set cnc.isolation.feedRate=120.",
    ),
  ),
  unsetOverrides: Flag.string("unset").pipe(
    Flag.atMost(Number.MAX_SAFE_INTEGER),
    Flag.withMetavar("path"),
    Flag.withDescription("Clear an optional config value."),
  ),
  flatcam: Flag.string("flatcam").pipe(
    Flag.withDescription("Override dependencies.flatcam."),
    Flag.optional,
  ),
  boardFile: Flag.string("board-file").pipe(
    Flag.withDescription("Override board.file."),
    Flag.optional,
  ),
  skipRenderBoard: Flag.boolean("skip-render-board").pipe(
    Flag.withDescription("Override skipRenderBoard."),
    Flag.optional,
  ),
  gcodeDir: Flag.string("gcode-dir").pipe(
    Flag.withDescription("Override paths.gcode."),
    Flag.optional,
  ),
  gerbersDir: Flag.string("gerbers-dir").pipe(
    Flag.withDescription("Override paths.gerbers."),
    Flag.optional,
  ),
  pngDir: Flag.string("png-dir").pipe(
    Flag.withDescription("Override paths.png."),
    Flag.optional,
  ),
  solderMask: Flag.boolean("solder-mask").pipe(
    Flag.withDescription("Override solderMask.generate."),
    Flag.optional,
  ),
  stencil: Flag.boolean("stencil").pipe(
    Flag.withDescription("Override stencil.generate."),
    Flag.optional,
  ),
  drills: Flag.boolean("drills").pipe(
    Flag.withDescription("Override drills.generate."),
    Flag.optional,
  ),
  place: Flag.boolean("place").pipe(
    Flag.withDescription("Override place.generate."),
    Flag.optional,
  ),
  isolationFeedRate: Flag.float("isolation-feed-rate").pipe(
    Flag.withDescription("Override cnc.isolation.feedRate."),
    Flag.optional,
  ),
  isolationToolDiameter: Flag.float("isolation-tool-diameter").pipe(
    Flag.withDescription("Override cnc.isolation.tool.diameter."),
    Flag.optional,
  ),
  xtoolCdpPort: Flag.integer("xtool-cdp-port").pipe(
    Flag.withDescription("Override xtool.cdpPort."),
    Flag.optional,
  ),
};

const optionalAlias = <A>(
  value: Option.Option<A>,
  path: string,
  source: string,
): readonly CliAliasOverride[] => {
  const override = Option.getOrUndefined(value);
  return override === undefined ? [] : [{ path, value: override, source }];
};

export const buildCliOverrideObject = (
  input: SharedCliInput,
): Record<string, unknown> => {
  const aliases: readonly CliAliasOverride[] = [
    ...optionalAlias(
      input.pathToKicad,
      "dependencies.kicadCli",
      "--path-to-kicad",
    ),
    ...optionalAlias(input.flatcam, "dependencies.flatcam", "--flatcam"),
    ...optionalAlias(input.boardFile, "board.file", "--board-file"),
    ...optionalAlias(
      input.skipRenderBoard,
      "skipRenderBoard",
      "--skip-render-board",
    ),
    ...optionalAlias(input.gcodeDir, "paths.gcode", "--gcode-dir"),
    ...optionalAlias(input.gerbersDir, "paths.gerbers", "--gerbers-dir"),
    ...optionalAlias(input.pngDir, "paths.png", "--png-dir"),
    ...optionalAlias(input.solderMask, "solderMask.generate", "--solder-mask"),
    ...optionalAlias(input.stencil, "stencil.generate", "--stencil"),
    ...optionalAlias(input.drills, "drills.generate", "--drills"),
    ...optionalAlias(input.place, "place.generate", "--place"),
    ...optionalAlias(
      input.isolationFeedRate,
      "cnc.isolation.feedRate",
      "--isolation-feed-rate",
    ),
    ...optionalAlias(
      input.isolationToolDiameter,
      "cnc.isolation.tool.diameter",
      "--isolation-tool-diameter",
    ),
    ...optionalAlias(input.xtoolCdpPort, "xtool.cdpPort", "--xtool-cdp-port"),
  ];

  return buildCliOverrides({
    set: input.setOverrides,
    unset: input.unsetOverrides,
    aliases,
  });
};

export const loadConfigFromCli = Effect.fn("flatmaxx.loadConfigFromCli")(
  function* (input: FlatmaxxCliInput) {
    const cliOverrides = yield* Effect.try({
      try: () => buildCliOverrideObject(input),
      catch: (cause) =>
        cause instanceof CliError
          ? cause
          : new CliError({
              message: cause instanceof Error ? cause.message : String(cause),
              cause,
            }),
    });

    return yield* loadFlatmaxxConfig({
      projectRoot: input.kicadProject,
      configPath: Option.getOrUndefined(input.configPath),
      cliOverrides,
    });
  },
);

export const resolveKicadCli = (config: ResolvedConfig) =>
  config.dependencies.kicadCli ?? defaultKicadCli;

export const resolveFlatcam = (config: ResolvedConfig) =>
  config.dependencies.flatcam ?? defaultFlatcam;

export const resolveBoardImagePngPath = Effect.fn(
  "flatmaxx.resolveBoardImagePngPath",
)(function* (config: ResolvedConfig) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const pngDir = config.paths.png;

  const exists = yield* fs
    .exists(pngDir)
    .pipe(Effect.catch(() => Effect.succeed(false)));
  if (!exists) {
    return Option.none<string>();
  }

  const entries = yield* fs
    .readDirectory(pngDir)
    .pipe(Effect.catch(() => Effect.succeed<readonly string[]>([])));

  return Option.map(
    Array.findFirst(entries, (name) =>
      name.endsWith(`-${boardImageFileSuffix}.png`),
    ),
    (name) => path.join(pngDir, name),
  );
});

export const prepareProjectContext = Effect.fn(
  "flatmaxx.prepareProjectContext",
)(function* (
  config: ResolvedConfig,
  options: { readonly checkKicad?: boolean | undefined } = {},
) {
  const path = yield* Path.Path;
  const kicadCli = resolveKicadCli(config);

  if (options.checkKicad) {
    yield* ensureKicadExists(kicadCli);
  }

  const pcbFile = yield* findPCBProject(
    config.projectDir,
    buildBoardSelectionOptions(config),
  );
  const pcbName = path.basename(pcbFile, ".kicad_pcb");

  return {
    config,
    projectDir: config.projectDir,
    kicadCli,
    pcbFile,
    pcbName,
  };
});

export const mergeWithParentInput = (
  input: ProjectCliInput,
  parent: SharedCliInput,
): FlatmaxxCliInput => ({
  ...input,
  pathToKicad: parent.pathToKicad,
  configPath: parent.configPath,
  setOverrides: parent.setOverrides,
  unsetOverrides: parent.unsetOverrides,
  flatcam: parent.flatcam,
  boardFile: parent.boardFile,
  skipRenderBoard: parent.skipRenderBoard,
  gcodeDir: parent.gcodeDir,
  gerbersDir: parent.gerbersDir,
  pngDir: parent.pngDir,
  solderMask: parent.solderMask,
  stencil: parent.stencil,
  drills: parent.drills,
  place: parent.place,
  isolationFeedRate: parent.isolationFeedRate,
  isolationToolDiameter: parent.isolationToolDiameter,
  xtoolCdpPort: parent.xtoolCdpPort,
});
