import spinners from "cli-spinners";
import { Task } from "ink-task-list";
import { taskShouldExpand } from "./taskShouldExpand";
import type { TaskDef } from "./types";

export const SingleTaskRenderer = ({
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
		isExpanded={taskShouldExpand({
			id,
			state,
			label,
			output,
			status,
			children,
		})}
	>
		{children?.map((child) => (
			<SingleTaskRenderer key={child.id} {...child} />
		))}
	</Task>
);
