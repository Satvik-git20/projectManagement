import type { Status } from "./constants";
import type { TaskDTO } from "./types";

export function byPosition(a: TaskDTO, b: TaskDTO) {
  if (a.position === b.position) {
    return a.createdAt.localeCompare(b.createdAt);
  }
  return a.position - b.position;
}

export function tasksInColumn(tasks: TaskDTO[], status: Status) {
  return tasks.filter((task) => task.status === status).sort(byPosition);
}

export function midpointPosition(
  before: TaskDTO | undefined,
  after: TaskDTO | undefined,
) {
  if (before && after) return (before.position + after.position) / 2;
  if (before) return before.position + 1;
  if (after) return after.position - 1;
  return 1;
}

export function applyMove(
  tasks: TaskDTO[],
  taskId: string,
  status: Status,
  beforeId: string | null,
  afterId: string | null,
) {
  const moving = tasks.find((task) => task.id === taskId);
  if (!moving) return tasks;

  const column = tasks
    .filter((task) => task.status === status && task.id !== taskId)
    .sort(byPosition);

  const before = beforeId ? column.find((task) => task.id === beforeId) : undefined;
  const after = afterId ? column.find((task) => task.id === afterId) : undefined;

  const position = midpointPosition(before, after);

  return tasks
    .map((task) =>
      task.id === taskId
        ? {
            ...task,
            status,
            position,
            completedAt:
              status === "DONE" ? task.completedAt ?? new Date().toISOString() : null,
          }
        : task,
    )
    .sort(byPosition);
}

export function completionPercent(tasks: TaskDTO[]) {
  if (tasks.length === 0) return 0;
  const done = tasks.filter((task) => task.status === "DONE").length;
  return Math.round((done / tasks.length) * 100);
}
