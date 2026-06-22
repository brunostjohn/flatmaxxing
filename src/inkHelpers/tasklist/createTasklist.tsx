import { Effect, MutableHashMap } from "effect";
import { render } from "ink";
import { errorToTaskOutput } from "./errorToTaskOutput";
import { joinTaskPath } from "./joinTaskPath";
import { normalizeTaskPath } from "./normalizeTaskPath";
import { patchTaskInTree } from "./patchTaskInTree";
import { TaskRenderer } from "./TaskRenderer";
import type {
  RunTaskOptions,
  TaskDef,
  TasklistControls,
  TaskPath,
  TaskPathInput,
  TaskPatch,
  TaskScope,
  TaskState,
} from "./types";

export const createTasklist = Effect.fn("flatmaxx.ink.createTasklist")(
  function* (initialTasks: TaskDef[], title?: string) {
    const tasks = MutableHashMap.make(
      ...initialTasks.map((task) => [task.id, task] as const),
    );

    const readTasks = () => Array.from(MutableHashMap.values(tasks));
    const writeTasks = (nextTasks: readonly TaskDef[]) => {
      MutableHashMap.clear(tasks);
      for (const task of nextTasks) {
        MutableHashMap.set(tasks, task.id, task);
      }
    };
    const renderTasks = () =>
      rerender(<TaskRenderer tasks={readTasks()} title={title} />);
    const flushRender = Effect.promise(() => waitUntilRenderFlush());
    const updateAndRender = (
      update: (currentTasks: readonly TaskDef[]) => TaskDef[],
    ) =>
      Effect.gen(function* () {
        writeTasks(update(readTasks()));
        yield* Effect.sync(renderTasks);
        yield* flushRender;
      });
    const patchTaskAt = (path: TaskPathInput, task: TaskPatch) =>
      updateAndRender((currentTasks) =>
        patchTaskInTree(currentTasks, normalizeTaskPath(path), task),
      );

    const { rerender, waitUntilRenderFlush, unmount, waitUntilExit } = render(
      <TaskRenderer tasks={readTasks()} title={title} />,
    );

    yield* Effect.addFinalizer(() =>
      Effect.gen(function* () {
        yield* Effect.sync(() => unmount());
        yield* Effect.promise(() => waitUntilExit());
      }),
    );

    const makeScope = (basePath: TaskPath): TaskScope => {
      const resolvePath = (path: TaskPathInput) => joinTaskPath(basePath, path);

      const scope: TaskScope = {
        patchTask: (path, task) => patchTaskAt(resolvePath(path), task),
        setTaskState: (path, state) =>
          patchTaskAt(resolvePath(path), { state }),
        setTaskOutput: (path, output) =>
          patchTaskAt(resolvePath(path), { output }),
        setTaskStatus: (path, status) =>
          patchTaskAt(resolvePath(path), { status }),
        runTask: <A, E, R>(options: RunTaskOptions<A, E, R>) =>
          runTask({ ...options, path: resolvePath(options.path) }),
        scope: (path) => makeScope(resolvePath(path)),
      };

      return scope;
    };

    const runTask = <A, E, R>({
      path,
      effect,
      loading,
      success,
      error,
    }: RunTaskOptions<A, E, R>) =>
      Effect.gen(function* () {
        yield* patchTaskAt(path, { state: "loading", ...loading });

        const result = yield* effect.pipe(Effect.result);

        if (result._tag === "Success") {
          yield* patchTaskAt(path, {
            state: "success",
            status: "",
            ...success,
          });
          return result.success;
        }

        const errorPatch =
          typeof error === "function" ? error(result.failure) : error;
        yield* patchTaskAt(path, {
          state: "error",
          output: errorToTaskOutput(result.failure),
          ...errorPatch,
        });
        return yield* Effect.fail(result.failure);
      });

    const controls: TasklistControls = {
      patchTask: patchTaskAt,
      setTaskState: (path: TaskPathInput, state: TaskState) =>
        patchTaskAt(path, { state }),
      setTaskOutput: (path: TaskPathInput, output: string) =>
        patchTaskAt(path, { output }),
      setTaskStatus: (path: TaskPathInput, status: string) =>
        patchTaskAt(path, { status }),
      runTask,
      scope: (path) => makeScope(normalizeTaskPath(path)),
    };

    return controls;
  },
);
