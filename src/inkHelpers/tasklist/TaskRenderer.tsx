import { Text } from "ink";
import { TaskList } from "ink-task-list";
import { SingleTaskRenderer } from "./SingleTaskRenderer";
import type { TaskDef } from "./types";

export const TaskRenderer = ({
  tasks,
  title,
}: {
  tasks: readonly TaskDef[];
  title?: string;
}) => (
  <>
    {title && (
      <Text color="blue" bold>
        {title}
      </Text>
    )}
    <TaskList>
      {tasks.map((task) => (
        <SingleTaskRenderer key={task.id} {...task} />
      ))}
    </TaskList>
  </>
);
