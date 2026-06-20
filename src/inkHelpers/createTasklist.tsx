import spinners from "cli-spinners";
import { Effect, MutableHashMap } from "effect";
import { render, Text } from "ink";
import { Task, TaskList } from "ink-task-list";

export interface TaskDef {
  id: string;
  label: string;
  output?: string;
  status?: string;
  state: "pending" | "loading" | "success" | "warning" | "error";
  children?: TaskDef[];
}

const SingleTaskRenderer = ({
  id,
  state,
  label,
  output,
  status,
  children,
}: TaskDef) => (
  <Task
    key={id}
    state={state}
    label={label}
    output={output}
    spinner={spinners.dots}
    status={status}
    isExpanded={children?.some((child) => child.state !== "success")}
  >
    {children?.map((child) => (
      <SingleTaskRenderer key={child.id} {...child} />
    ))}
  </Task>
);

const TaskRenderer = ({
  tasks,
  title,
}: {
  tasks: MutableHashMap.MutableHashMap<string, TaskDef>;
  title?: string;
}) => (
  <>
    {title && (
      <Text color="blue" bold>
        {title}
      </Text>
    )}
    <TaskList>
      {Array.from(MutableHashMap.values(tasks)).map(({ id, ...taskDef }) => (
        <SingleTaskRenderer key={id} id={id} {...taskDef} />
      ))}
    </TaskList>
  </>
);

export const createTasklist = Effect.fn("flatmaxx.ink.createTasklist")(
  function* (initialTasks: TaskDef[], title?: string) {
    const tasks = MutableHashMap.make(
      ...initialTasks.map((task) => [task.id, task] as const),
    );

    const { rerender, waitUntilRenderFlush, unmount, waitUntilExit } = render(
      <TaskRenderer tasks={tasks} title={title} />,
    );

    yield* Effect.addFinalizer(() =>
      Effect.gen(function* () {
        yield* Effect.sync(() => unmount());
        yield* Effect.promise(() => waitUntilExit());
      }),
    );

    return {
      executeWithTask: Effect.fn("flatmaxx.ink.createTasklist.executeWithTask")(
        function* <A, E, R>({
          taskId,
          effect,
          executingLabel,
          doneLabel,
          errorLabel,
        }: {
          taskId: string;
          effect: Effect.Effect<A, E, R>;
          executingLabel?: string;
          doneLabel?: string;
          errorLabel?: string;
        }) {
          MutableHashMap.modify(tasks, taskId, (oldTask) => ({
            ...oldTask,
            state: "loading" as const,
            label: executingLabel ?? oldTask.label,
          }));
          yield* Effect.sync(() =>
            rerender(<TaskRenderer tasks={tasks} title={title} />),
          );
          yield* Effect.promise(() => waitUntilRenderFlush());

          const result = yield* effect.pipe(Effect.result);

          if (result._tag === "Success") {
            MutableHashMap.modify(tasks, taskId, (oldTask) => ({
              ...oldTask,
              state: "success" as const,
              label: doneLabel ?? oldTask.label,
            }));
          } else {
            MutableHashMap.modify(tasks, taskId, (oldTask) => ({
              ...oldTask,
              state: "error" as const,
              label: errorLabel ?? oldTask.label,
              output: result.failure as string,
            }));
          }

          yield* Effect.sync(() =>
            rerender(<TaskRenderer tasks={tasks} title={title} />),
          );
          yield* Effect.promise(() => waitUntilRenderFlush());

          if (result._tag === "Failure") {
            return yield* Effect.fail(result.failure);
          }

          return yield* Effect.succeed(result.success);
        },
      ),
      appendTask: Effect.fn("flatmaxx.ink.createTasklist.appendTask")(
        function* (task: TaskDef) {
          MutableHashMap.set(tasks, task.id, task);
          yield* Effect.sync(() =>
            rerender(<TaskRenderer tasks={tasks} title={title} />),
          );
          yield* Effect.promise(() => waitUntilRenderFlush());
        },
      ),
      removeTask: Effect.fn("flatmaxx.ink.createTasklist.removeTask")(
        function* (id: string) {
          MutableHashMap.remove(tasks, id);
          yield* Effect.sync(() =>
            rerender(<TaskRenderer tasks={tasks} title={title} />),
          );
          yield* Effect.promise(() => waitUntilRenderFlush());
        },
      ),
      patchTask: Effect.fn("flatmaxx.ink.createTasklist.patchTask")(function* (
        id: string,
        task: Partial<TaskDef>,
      ) {
        MutableHashMap.modify(tasks, id, (oldTask) => ({
          ...oldTask,
          ...task,
        }));
        yield* Effect.sync(() =>
          rerender(<TaskRenderer tasks={tasks} title={title} />),
        );
        yield* Effect.promise(() => waitUntilRenderFlush());
      }),
      setTaskState: Effect.fn("flatmaxx.ink.createTasklist.setTaskState")(
        function* (
          id: string,
          state: "pending" | "loading" | "success" | "warning" | "error",
        ) {
          MutableHashMap.modify(tasks, id, (oldTask) => ({
            ...oldTask,
            state,
          }));
          yield* Effect.sync(() =>
            rerender(<TaskRenderer tasks={tasks} title={title} />),
          );
          yield* Effect.promise(() => waitUntilRenderFlush());
        },
      ),
      setTaskOutput: Effect.fn("flatmaxx.ink.createTasklist.setTaskOutput")(
        function* (id: string, output: string) {
          MutableHashMap.modify(tasks, id, (oldTask) => ({
            ...oldTask,
            output,
          }));
          yield* Effect.sync(() =>
            rerender(<TaskRenderer tasks={tasks} title={title} />),
          );
          yield* Effect.promise(() => waitUntilRenderFlush());
        },
      ),
      setTaskStatus: Effect.fn("flatmaxx.ink.createTasklist.setTaskStatus")(
        function* (id: string, status: string) {
          MutableHashMap.modify(tasks, id, (oldTask) => ({
            ...oldTask,
            status,
          }));
          yield* Effect.sync(() =>
            rerender(<TaskRenderer tasks={tasks} title={title} />),
          );
          yield* Effect.promise(() => waitUntilRenderFlush());
        },
      ),
      setTaskChildren: Effect.fn("flatmaxx.ink.createTasklist.setTaskChildren")(
        function* (id: string, children: TaskDef[]) {
          MutableHashMap.modify(tasks, id, (oldTask) => ({
            ...oldTask,
            children,
          }));
          yield* Effect.sync(() =>
            rerender(<TaskRenderer tasks={tasks} title={title} />),
          );
          yield* Effect.promise(() => waitUntilRenderFlush());
        },
      ),
      appendTaskChildren: Effect.fn(
        "flatmaxx.ink.createTasklist.appendTaskChildren",
      )(function* (id: string, children: TaskDef[]) {
        MutableHashMap.modify(tasks, id, (oldTask) => ({
          ...oldTask,
          children: [...(oldTask.children ?? []), ...children],
        }));
        yield* Effect.sync(() =>
          rerender(<TaskRenderer tasks={tasks} title={title} />),
        );
        yield* Effect.promise(() => waitUntilRenderFlush());
      }),
      removeTaskChildren: Effect.fn(
        "flatmaxx.ink.createTasklist.removeTaskChildren",
      )(function* (id: string, children: TaskDef[]) {
        MutableHashMap.modify(tasks, id, (oldTask) => ({
          ...oldTask,
          children: oldTask.children?.filter(
            (child) => !children.includes(child),
          ),
        }));
        yield* Effect.sync(() =>
          rerender(<TaskRenderer tasks={tasks} title={title} />),
        );
        yield* Effect.promise(() => waitUntilRenderFlush());
      }),
      modifyTaskChild: Effect.fn("flatmaxx.ink.createTasklist.modifyTaskChild")(
        function* (id: string, childId: string, childDef: Partial<TaskDef>) {
          MutableHashMap.modify(tasks, id, (oldTask) => ({
            ...oldTask,
            children: oldTask.children?.map((child) =>
              child.id === childId ? { ...child, ...childDef } : child,
            ),
          }));
          yield* Effect.sync(() =>
            rerender(<TaskRenderer tasks={tasks} title={title} />),
          );
          yield* Effect.promise(() => waitUntilRenderFlush());
        },
      ),
    } as const;
  },
);
