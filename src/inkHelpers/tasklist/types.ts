import type { Effect } from "effect";

export type TaskState = "pending" | "loading" | "success" | "warning" | "error";

export type TaskPath = readonly [string, ...string[]];

export type TaskPathInput = string | TaskPath;

export interface TaskDef {
  id: string;
  label: string;
  output?: string;
  status?: string;
  state: TaskState;
  children?: TaskDef[];
}

export type TaskPatch = Partial<TaskDef>;

export interface BranchPatch extends TaskPatch {
  readonly childStatus?: string | undefined;
}

export interface RunTaskOptions<A, E, R> {
  path: TaskPathInput;
  effect: Effect.Effect<A, E, R>;
  loading?: TaskPatch;
  success?: TaskPatch;
  error?: TaskPatch | ((error: E) => TaskPatch);
}

export interface TaskScope {
  patchTask: (path: TaskPathInput, task: TaskPatch) => Effect.Effect<void>;
  setTaskState: (path: TaskPathInput, state: TaskState) => Effect.Effect<void>;
  setTaskOutput: (path: TaskPathInput, output: string) => Effect.Effect<void>;
  setTaskStatus: (path: TaskPathInput, status: string) => Effect.Effect<void>;
  runTask: <A, E, R>(
    options: RunTaskOptions<A, E, R>,
  ) => Effect.Effect<A, E, R>;
  scope: (path: TaskPathInput) => TaskScope;
}

export type TasklistControls = TaskScope;
