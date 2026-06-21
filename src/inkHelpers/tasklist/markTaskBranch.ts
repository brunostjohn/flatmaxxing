import { Effect } from "effect";
import { normalizeTaskPath } from "./normalizeTaskPath";
import type {
	TaskDef,
	TasklistControls,
	TaskPath,
	TaskPathInput,
	TaskPatch,
} from "./types";

type BranchPatch = TaskPatch & {
	readonly childStatus?: string | undefined;
};

const findTask = (
	tasks: readonly TaskDef[],
	path: readonly string[],
): TaskDef | undefined => {
	const [id, ...rest] = path;
	const task = tasks.find((task) => task.id === id);

	if (!task || rest.length === 0) {
		return task;
	}

	return findTask(task.children ?? [], rest);
};

const patchBranch = (
	controls: TasklistControls,
	path: TaskPath,
	task: TaskDef,
	patch: BranchPatch,
): Effect.Effect<void> =>
	Effect.gen(function* () {
		yield* controls.patchTask(path, patch);

		for (const child of task.children ?? []) {
			const childPath = [...path, child.id] as TaskPath;
			yield* patchBranch(controls, childPath, child, {
				state: patch.state,
				label:
					patch.state === "success" ? `${child.label} skipped.` : child.label,
				status: patch.childStatus ?? patch.status,
			});
		}
	});

export const markTaskBranch = Effect.fn("flatmaxx.tasklist.markTaskBranch")(
	function* (
		controls: TasklistControls,
		allTasks: readonly TaskDef[],
		path: TaskPathInput,
		patch: BranchPatch,
	) {
		const normalizedPath = normalizeTaskPath(path);
		const task = findTask(allTasks, normalizedPath);

		if (!task) {
			return yield* Effect.fail(
				new Error(`Task path not found: ${normalizedPath.join("/")}`),
			);
		}

		yield* patchBranch(controls, normalizedPath, task, patch);
	},
);

export const markTaskBranchSkipped = (
	controls: TasklistControls,
	allTasks: readonly TaskDef[],
	path: TaskPathInput,
	status: string,
) =>
	markTaskBranch(controls, allTasks, path, {
		state: "success",
		label: "Skipped.",
		status,
		childStatus: status,
	});
