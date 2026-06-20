import type { TaskDef, TaskPath } from "./types";

export function updateTaskInTree(
	tasks: readonly TaskDef[],
	path: TaskPath,
	update: (task: TaskDef) => TaskDef,
): TaskDef[] {
	const [id, ...rest] = path;

	return tasks.map((task) => {
		if (task.id !== id) {
			return task;
		}

		if (rest.length === 0) {
			return update(task);
		}

		return {
			...task,
			children: updateTaskInTree(
				task.children ?? [],
				rest as unknown as TaskPath,
				update,
			),
		};
	});
}
