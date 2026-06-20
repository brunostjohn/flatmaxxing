import type { TaskDef } from "./types";

export function taskShouldExpand(task: TaskDef): boolean {
	return (
		task.children?.some(
			(child) =>
				child.state === "loading" ||
				child.state === "error" ||
				taskShouldExpand(child),
		) ?? false
	);
}
