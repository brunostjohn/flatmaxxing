import type { BoardSelectionOptions } from "@/config";
import { KicadError } from "@/errors";
import { createTasklist, renderWithOutput } from "@/inkHelpers";
import { findProjectTasks } from "@/stages/kicad/discovery/tasks";
import { discoveryTaskPaths } from "@/stages/kicad/discovery/taskPaths";
import { Array, Effect, FileSystem, Match, Path } from "effect";
import { Text } from "ink";
import SelectInput from "ink-select-input";

const resolveConfiguredBoardFile = Effect.fn(
  "flatmaxx.findPCBProject.resolveConfiguredBoardFile",
)(function* (boardFile: string) {
  const fs = yield* FileSystem.FileSystem;

  if (!boardFile.endsWith(".kicad_pcb")) {
    return yield* Effect.fail(
      new KicadError({
        message: `The configured board file "${boardFile}" is not a .kicad_pcb file.`,
      }),
    );
  }

  if (!(yield* fs.exists(boardFile))) {
    return yield* Effect.fail(
      new KicadError({
        message: `The configured board file "${boardFile}" does not exist.`,
      }),
    );
  }

  return boardFile;
});

const findProjects = Effect.fn("flatmaxx.findPCBProject.findProjects")(
  function* (pathToDirectory: string) {
    const fs = yield* FileSystem.FileSystem;

    if (!(yield* fs.exists(pathToDirectory))) {
      return yield* Effect.fail(
        new KicadError({
          message: `The directory "${pathToDirectory}" does not exist.`,
        }),
      );
    }

    const found = yield* fs
      .readDirectory(pathToDirectory)
      .pipe(Effect.map(Array.filter((file) => file.endsWith(".kicad_pcb"))));

    if (found.length === 0) {
      return yield* Effect.fail(
        new KicadError({
          message: `No KiCAD projects found in the directory "${pathToDirectory}".`,
        }),
      );
    }

    return found;
  },
);

const selectProject = (projects: readonly string[]) =>
  renderWithOutput<string>((send) => (
    <>
      <Text color="gray">
        Found more than one project. Select which one to use:
      </Text>
      <SelectInput
        items={projects.map((project) => ({
          label: project,
          value: project,
        }))}
        onSelect={({ value }) => send(value)}
      />
    </>
  ));

export const findPCBProject = Effect.fn("flatmaxx.findPCBProject")(function* (
  pathToDirectory: string,
  options: BoardSelectionOptions = {},
) {
  const path = yield* Path.Path;
  const tasks = yield* createTasklist(findProjectTasks);

  if (options.boardFile) {
    return yield* tasks.runTask({
      path: discoveryTaskPaths.findProject,
      effect: resolveConfiguredBoardFile(options.boardFile),
      loading: { status: "Validating configured board file..." },
      success: { label: "Configured project file found." },
      error: { label: "Configured board file invalid." },
    });
  }

  const projects = yield* tasks.runTask({
    path: discoveryTaskPaths.findProject,
    effect: findProjects(pathToDirectory),
    loading: { status: "Checking for KiCAD projects..." },
    success: { label: "KiCAD project found." },
    error: { label: "No KiCAD project found." },
  });

  return yield* Match.value(projects.length).pipe(
    Match.when(1, () =>
      Effect.succeed(path.resolve(pathToDirectory, projects[0]!)),
    ),
    Match.orElse(() =>
      selectProject(projects).pipe(
        Effect.map((project) => path.resolve(pathToDirectory, project)),
      ),
    ),
  );
}, Effect.scoped);
