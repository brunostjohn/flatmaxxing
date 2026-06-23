import {
  buildBoardSelectionOptions,
  defaultFlatcam,
  defaultKicadCli,
  loadFlatmaxxConfig,
  type ResolvedConfig,
} from "@/config";
import { ensureKicadExists, findPCBProject } from "@/stages";
import { Effect, Option } from "effect";
import { Argument, Flag } from "effect/unstable/cli";
import { basename } from "node:path";

export type ProjectCliInput = {
  readonly kicadProject: string;
};

export type SharedCliInput = {
  readonly pathTokKicad: Option.Option<string>;
  readonly configPath: Option.Option<string>;
};

export type FlatmaxxCliInput = ProjectCliInput & SharedCliInput;

export type FlatmaxxProjectContext = {
  readonly config: ResolvedConfig;
  readonly projectDir: string;
  readonly kicadCli: string;
  readonly pcbFile: string;
  readonly pcbName: string;
};

export const projectArgument = Argument.string("kicad-project").pipe(
  Argument.withDescription("The path to the KiCAD project directory."),
  Argument.withDefault(process.cwd()),
);

export const sharedFlags = {
  pathTokKicad: Flag.string("path-to-kicad").pipe(
    Flag.withAlias("-k"),
    Flag.withDescription("The path to the KiCAD CLI executable."),
    Flag.optional,
  ),
  configPath: Flag.string("config").pipe(
    Flag.withAlias("-c"),
    Flag.withDescription("The path to a flatmaxxing TOML config file."),
    Flag.optional,
  ),
};

export const loadConfigFromCli = Effect.fn("flatmaxx.loadConfigFromCli")(
  function* ({ kicadProject, pathTokKicad, configPath }: FlatmaxxCliInput) {
    return yield* loadFlatmaxxConfig({
      projectRoot: kicadProject,
      configPath: Option.getOrUndefined(configPath),
      cliOverrides: {
        kicadCli: Option.getOrUndefined(pathTokKicad),
      },
    });
  },
);

export const resolveKicadCli = (config: ResolvedConfig) =>
  config.dependencies.kicadCli ?? defaultKicadCli;

export const resolveFlatcam = (config: ResolvedConfig) =>
  config.dependencies.flatcam ?? defaultFlatcam;

export const prepareProjectContext = Effect.fn(
  "flatmaxx.prepareProjectContext",
)(function* (
  input: ProjectCliInput,
  config: ResolvedConfig,
  options: { readonly checkKicad?: boolean | undefined } = {},
) {
  const kicadCli = resolveKicadCli(config);

  if (options.checkKicad) {
    yield* ensureKicadExists(kicadCli);
  }

  const pcbFile = yield* findPCBProject(
    config.projectDir,
    buildBoardSelectionOptions(config),
  );
  const pcbName = yield* Effect.sync(() => basename(pcbFile, ".kicad_pcb"));

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
  pathTokKicad: parent.pathTokKicad,
  configPath: parent.configPath,
});
