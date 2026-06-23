import {
  makeBuildCommand,
  makeDoctorCommand,
  makeValidateCommand,
  rootBuildCommand,
} from "@/commands";
import { MakeraCamProcessControlLive } from "@/stages/makeracam";
import { BunRuntime, BunServices } from "@effect/platform-bun";
import { Effect, Layer } from "effect";
import { Command } from "effect/unstable/cli";

const Flatmaxx = rootBuildCommand.pipe(
  Command.withSubcommands([
    makeBuildCommand(rootBuildCommand),
    makeDoctorCommand(rootBuildCommand),
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
  ]),
);

const AppLayer = Layer.mergeAll(
  BunServices.layer,
  MakeraCamProcessControlLive.pipe(Layer.provide(BunServices.layer)),
);

const Main = Flatmaxx.pipe(
  Command.run({ version: "1.0.0" }),
  Effect.provide(AppLayer),
  Effect.scoped,
);

BunRuntime.runMain(Main, { disableErrorReporting: false });
