import {
  makeBuildCommand,
  makeCleanCommand,
  makeConfigCommand,
  makeDoctorCommand,
  makeInitCommand,
  makeSkillsCommand,
  makeUpdateCommand,
  makeValidateCommand,
  rootBuildCommand,
} from "@/commands";
import { MakeraCamProcessControlLive } from "@/stages/makeracam";
import { VERSION } from "@/version";
import { BunRuntime, BunServices } from "@effect/platform-bun";
import { Effect, Layer, Path } from "effect";
import { Command } from "effect/unstable/cli";
import { FetchHttpClient } from "effect/unstable/http";

const Flatmaxx = rootBuildCommand.pipe(
  Command.withSubcommands([
    makeBuildCommand(rootBuildCommand),
    makeCleanCommand(rootBuildCommand),
    makeConfigCommand(rootBuildCommand),
    makeDoctorCommand(rootBuildCommand),
    makeInitCommand(),
    makeSkillsCommand(),
    makeUpdateCommand(),
    makeValidateCommand(rootBuildCommand),
  ]),
  Command.withDescription("Creates CNC files from a KiCAD project."),
  Command.withExamples([
    {
      command: "flatmaxx <kicad-project>",
      description: "Creates CNC files from a KiCAD project.",
    },
    {
      command: "flatmaxx build <kicad-project>",
      description: "Same as the root command; creates CNC files.",
    },
    {
      command: "flatmaxx init",
      description: "Creates a flatmaxxing.toml config for the current project.",
    },
    {
      command: "flatmaxx config",
      description: "Opens an interactive editor for project config overrides.",
    },
    {
      command: "flatmaxx config --user",
      description: "Opens an interactive editor for ~/flatmaxxing.user.toml.",
    },
    {
      command: "flatmaxx skills install --global",
      description: "Installs the flatmaxxing agent skill for the current user.",
    },
    {
      command: "flatmaxx <kicad-project> -k <path-to-kicad>",
      description:
        "Creates CNC files from a KiCAD project with a custom KiCAD CLI executable.",
    },
    {
      command: "flatmaxx <kicad-project> --config flatmaxxing.toml",
      description: "Creates CNC files using an explicit config file.",
    },
    {
      command: "flatmaxx doctor <kicad-project>",
      description:
        "Checks required software and permissions without generating outputs.",
    },
    {
      command: "flatmaxx validate <kicad-project> --fix",
      description:
        "Runs validation checks without launching FlatCAM, xTool Studio, or MakeraCAM.",
    },
    {
      command: "flatmaxx clean <kicad-project>",
      description:
        "Removes generated output folders and files from a project directory.",
    },
    {
      command: "flatmaxx clean <kicad-project> --dry-run",
      description:
        "Lists the outputs that clean would remove without deleting.",
    },
    {
      command: "flatmaxx update",
      description:
        "Downloads and installs the latest flatmaxx release from GitHub.",
    },
  ]),
);

const AppLayer = Layer.mergeAll(
  BunServices.layer,
  Path.layer,
  FetchHttpClient.layer,
  MakeraCamProcessControlLive.pipe(Layer.provide(BunServices.layer)),
);

const Main = Flatmaxx.pipe(
  Command.run({ version: VERSION }),
  Effect.provide(AppLayer),
  Effect.scoped,
);

BunRuntime.runMain(Main, { disableErrorReporting: false });
