import {
  createXtoolProjects,
  ensureKicadExists,
  findPCBProject,
  generateKicadOutputs,
  validateKicadBoard,
} from "@/stages";
import { BunRuntime, BunServices } from "@effect/platform-bun";
import { Effect, Layer } from "effect";
import { Argument, Command, Flag } from "effect/unstable/cli";
import { basename } from "node:path";

const Flatmaxx = Command.make(
  "flatmaxx",
  {
    kicadProject: Argument.string("kicad-project").pipe(
      Argument.withDescription("The path to the KiCAD project directory."),
      Argument.withDefault(process.cwd()),
    ),
    pathTokKicad: Flag.string("path-to-kicad").pipe(
      Flag.withAlias("-k"),
      Flag.withDescription("The path to the KiCAD CLI executable."),
      Flag.withDefault(
        "/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli",
      ),
    ),
  },
  Effect.fn("flatmaxx.main")(function* ({ kicadProject, pathTokKicad }) {
    // yield* Effect.sync(() => askForAccessibilityAccess());

    yield* ensureKicadExists(pathTokKicad);

    const pcbFile = yield* findPCBProject(kicadProject);

    yield* validateKicadBoard(pcbFile);

    yield* generateKicadOutputs(pathTokKicad, kicadProject, pcbFile);

    const pcbName = yield* Effect.sync(() => basename(pcbFile, ".kicad_pcb"));
    yield* createXtoolProjects(kicadProject, pcbName, 10, 10);
  }),
).pipe(
  Command.withDescription("Creates CNC files from a KiCAD project."),
  Command.withExamples([
    {
      command: "flatmaxx <kicad-project>",
      description: "Creates CNC files from a KiCAD project.",
    },
    {
      command: "flatmaxx <kicad-project> -k <path-to-kicad>",
      description:
        "Creates CNC files from a KiCAD project with a custom KiCAD CLI executable.",
    },
  ]),
);

Flatmaxx.pipe(
  Command.run({ version: "1.0.0" }),
  Effect.provide(Layer.mergeAll(BunServices.layer)),
  Effect.scoped,
  BunRuntime.runMain({ disableErrorReporting: false }),
);
