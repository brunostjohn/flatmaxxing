import { renderOnce, renderWithOutput } from "@/inkHelpers";
import { Alert } from "@inkjs/ui";
import { Array, Effect } from "effect";
import { FileSystem } from "effect/FileSystem";
import { Text } from "ink";
import SelectInput from "ink-select-input";
import { resolve } from "node:path";

export const findPCBProject = Effect.fn("flatmaxx.findPCBProject")(function* (
  pathToDirectory: string,
) {
  const fs = yield* FileSystem;

  if (!(yield* fs.exists(pathToDirectory))) {
    yield* renderOnce(
      <Alert variant="error">
        The directory "{pathToDirectory}" does not exist.
      </Alert>,
    );

    yield* Effect.die(
      new Error(`The directory "${pathToDirectory}" does not exist.`),
    );
  }

  const foundProjects = yield* fs
    .readDirectory(pathToDirectory)
    .pipe(Effect.map(Array.filter((file) => file.endsWith(".kicad_pcb"))));

  if (foundProjects.length === 0) {
    yield* renderOnce(
      <Alert variant="error">
        No KiCAD projects found in the directory "{pathToDirectory}".
      </Alert>,
    );

    yield* Effect.die(
      new Error(
        `No KiCAD projects found in the directory "${pathToDirectory}".`,
      ),
    );
  }

  if (foundProjects.length === 1) {
    return yield* Effect.sync(() =>
      resolve(pathToDirectory, foundProjects[0]!),
    );
  }

  const project = yield* renderWithOutput<string>((send) => (
    <>
      <Text color="gray">
        Found more than one project. Select which one to use:
      </Text>
      <SelectInput
        items={foundProjects.map((project) => ({
          label: project,
          value: project,
        }))}
        onSelect={({ value }) => send(value)}
      />
    </>
  ));

  return yield* Effect.sync(() => resolve(pathToDirectory, project));
});
