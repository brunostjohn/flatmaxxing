import {
  ensureKicadExists,
  ensureKicadHasAValidOrigin,
  findPCBProject,
} from "@/stages";
import { BunRuntime, BunServices } from "@effect/platform-bun";
import { Effect } from "effect";
import { Argument, Command, Flag } from "effect/unstable/cli";

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
    yield* ensureKicadExists(pathTokKicad);

    const project = yield* findPCBProject(kicadProject);

    yield* ensureKicadHasAValidOrigin(project);
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
  Effect.provide(BunServices.layer),
  BunRuntime.runMain({ disableErrorReporting: true }),
);
