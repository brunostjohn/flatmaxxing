import { KicadError } from "@/errors";
import { createTasklist } from "@/inkHelpers";
import { ensureKicadTasks } from "@/stages/kicad/discovery/tasks";
import { discoveryTaskPaths } from "@/stages/kicad/discovery/taskPaths";
import { Effect, FileSystem } from "effect";

export const ensureKicadExists = Effect.fn("flatmaxx.ensureKicadExists")(
  function* (pathToKicad: string) {
    const fs = yield* FileSystem.FileSystem;
    const tasks = yield* createTasklist(ensureKicadTasks);

    yield* tasks.runTask({
      path: discoveryTaskPaths.ensureKicad,
      loading: { status: `Checking ${pathToKicad}...` },
      success: { label: "KiCAD found." },
      error: { label: "KiCAD not found." },
      effect: Effect.gen(function* () {
        const exists = yield* fs.exists(pathToKicad);
        if (!exists) {
          return yield* Effect.fail(
            new KicadError({
              message: `The file "${pathToKicad}" does not exist.`,
            }),
          );
        }
      }),
    });
  },
  Effect.scoped,
);
